import React from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CapsuleRecording } from '../CapsuleRecording'
import { CapsuleProcessing } from '../CapsuleProcessing'
import { CapsulePreparing } from '../CapsulePreparing'
import { CapsulePolishing } from '../CapsulePolishing'
import { CapsuleAskRecording } from '../CapsuleAskRecording'
import { CapsuleAskThinking } from '../CapsuleAskThinking'
import { CapsuleError } from '../CapsuleError'
import { CapsuleComplete } from '../CapsuleComplete'
import { abortAskDictation, abortRecording } from '../../../lib/tauri'

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
  useReducedMotion: () => true,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../lib/tauri', () => ({
  abortRecording: vi.fn().mockResolvedValue(undefined),
  abortAskDictation: vi.fn().mockResolvedValue(undefined),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Capsule cancel buttons', () => {
  it('does not let recording cancel pointer events reach the capsule shell', () => {
    const onPointerDown = vi.fn()
    const onPointerUp = vi.fn()

    render(
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <CapsuleRecording />
      </div>,
    )

    const button = screen.getByRole('button', { name: 'capsule.cancelRecording' })
    fireEvent.pointerDown(button)
    fireEvent.pointerUp(button)
    fireEvent.click(button)

    expect(onPointerDown).not.toHaveBeenCalled()
    expect(onPointerUp).not.toHaveBeenCalled()
    expect(abortRecording).toHaveBeenCalledTimes(1)
  })

  it('does not let processing cancel pointer events reach the capsule shell', () => {
    const onPointerDown = vi.fn()
    const onPointerUp = vi.fn()

    render(
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <CapsuleProcessing />
      </div>,
    )

    const button = screen.getByRole('button', { name: 'capsule.cancelProcessing' })
    fireEvent.pointerDown(button)
    fireEvent.pointerUp(button)
    fireEvent.click(button)

    expect(onPointerDown).not.toHaveBeenCalled()
    expect(onPointerUp).not.toHaveBeenCalled()
    expect(abortRecording).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['preparing', CapsulePreparing, 'capsule.cancelRecording', abortRecording],
    ['polishing', CapsulePolishing, 'capsule.cancelPolishing', abortRecording],
    ['ask recording', CapsuleAskRecording, 'capsule.cancelRecording', abortAskDictation],
  ])('exposes a working cancel button while %s', async (_label, Component, label, command) => {
    const onPointerDown = vi.fn()
    const onPointerUp = vi.fn()

    render(
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <Component />
      </div>,
    )

    const button = screen.getByRole('button', { name: label })
    fireEvent.pointerDown(button)
    fireEvent.pointerUp(button)
    fireEvent.click(button)

    await waitFor(() => expect(command).toHaveBeenCalledTimes(1))
    expect(onPointerDown).not.toHaveBeenCalled()
    expect(onPointerUp).not.toHaveBeenCalled()
  })

  it('exposes a working cancel button while Ask is thinking', async () => {
    const onPointerDown = vi.fn()
    const onPointerUp = vi.fn()

    render(
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <CapsuleAskThinking />
      </div>,
    )

    const button = screen.getByRole('button', { name: 'capsule.cancelProcessing' })
    fireEvent.pointerDown(button)
    fireEvent.pointerUp(button)
    fireEvent.click(button)

    await waitFor(() => expect(abortAskDictation).toHaveBeenCalledTimes(1))
    expect(onPointerDown).not.toHaveBeenCalled()
    expect(onPointerUp).not.toHaveBeenCalled()
  })

  it('offers a dismiss button on the error capsule', () => {
    render(<CapsuleError />)
    expect(screen.getByRole('button', { name: 'capsule.cancelProcessing' })).toBeInTheDocument()
  })

  it('offers a dismiss button on the completion capsule', () => {
    render(<CapsuleComplete />)
    expect(screen.getByRole('button', { name: 'capsule.cancelProcessing' })).toBeInTheDocument()
  })
})
