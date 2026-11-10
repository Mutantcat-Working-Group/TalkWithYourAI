import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PolishRecoveryPrompt } from '../PolishRecoveryPrompt'
import { useAppStore } from '../../../stores/appStore'
import { submitPolishRecoveryChoice } from '../../../lib/tauri'

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag, props, children),
    },
  ),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../lib/tauri', () => ({
  submitPolishRecoveryChoice: vi.fn().mockResolvedValue(true),
}))

const failure = { error: 'HTTP 503', rawTextLength: 42, retryAvailable: true }

function armPrompt(prompt: typeof failure | null = failure) {
  act(() => {
    if (prompt) {
      useAppStore.getState().setPolishFailure(prompt)
    } else {
      useAppStore.getState().clearPolishFailure()
    }
  })
}

beforeEach(() => {
  useAppStore.getState().clearPolishFailure()
  vi.clearAllMocks()
  vi.mocked(submitPolishRecoveryChoice).mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
  useAppStore.getState().clearPolishFailure()
})

describe('PolishRecoveryPrompt', () => {
  it('renders nothing until the backend reports a failed polish', () => {
    render(<PolishRecoveryPrompt />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the prompt when llm:polish-failed arms the store', () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    const prompt = screen.getByRole('dialog')
    expect(prompt).toHaveAttribute('aria-label', 'polishRecovery.title')
    expect(screen.getByRole('button', { name: 'polishRecovery.retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'polishRecovery.insertRaw' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'polishRecovery.cancel' })).toBeInTheDocument()
  })

  it('does not render as a focus-stealing modal', () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal')
  })

  it('sends retry and keeps the prompt visible for the backend retry loop', async () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'polishRecovery.retry' }))
    })

    expect(submitPolishRecoveryChoice).toHaveBeenCalledWith('retry')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(useAppStore.getState().polishFailure).toEqual(failure)
    expect(useAppStore.getState().polishRecoveryAnswered).toBe(true)
  })

  it('sends insert_raw and clears the prompt', async () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'polishRecovery.insertRaw' }))
    })

    expect(submitPolishRecoveryChoice).toHaveBeenCalledWith('insert_raw')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('sends cancel from the dismiss affordance', async () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'polishRecovery.cancel' }))
    })

    expect(submitPolishRecoveryChoice).toHaveBeenCalledWith('cancel')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('answers only once when a button is double clicked', async () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    const insert = screen.getByRole('button', { name: 'polishRecovery.insertRaw' })
    await act(async () => {
      fireEvent.click(insert)
      fireEvent.click(insert)
    })

    expect(submitPolishRecoveryChoice).toHaveBeenCalledTimes(1)
    expect(submitPolishRecoveryChoice).toHaveBeenCalledWith('insert_raw')
  })

  it('re-arms after a second llm:polish-failed following a retry', async () => {
    render(<PolishRecoveryPrompt />)
    armPrompt()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'polishRecovery.retry' }))
    })
    expect(useAppStore.getState().polishRecoveryAnswered).toBe(true)

    armPrompt({ ...failure, error: 'HTTP 504' })
    expect(useAppStore.getState().polishRecoveryAnswered).toBe(false)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'polishRecovery.retry' }))
    })
    expect(submitPolishRecoveryChoice).toHaveBeenCalledTimes(2)
  })

  it('hides the retry action when the backend says retry is unavailable', () => {
    render(<PolishRecoveryPrompt />)
    armPrompt({ ...failure, retryAvailable: false })

    expect(screen.queryByRole('button', { name: 'polishRecovery.retry' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'polishRecovery.insertRaw' })).toBeInTheDocument()
  })
})
