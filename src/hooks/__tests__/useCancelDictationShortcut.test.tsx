import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCancelDictationShortcut } from '../useCancelDictationShortcut'
import { useAppStore } from '../../stores/appStore'
import { abortAskDictation, abortRecording, submitPolishRecoveryChoice } from '../../lib/tauri'

vi.mock('../../lib/tauri', () => ({
  abortRecording: vi.fn().mockResolvedValue(undefined),
  abortAskDictation: vi.fn().mockResolvedValue(undefined),
  submitPolishRecoveryChoice: vi.fn().mockResolvedValue(true),
}))

function Harness() {
  useCancelDictationShortcut()
  return <div data-testid="surface" />
}

function pressEscape(target: Element | Window = window) {
  fireEvent.keyDown(target, { key: 'Escape' })
}

beforeEach(() => {
  vi.clearAllMocks()
  useAppStore.setState({
    pipelineState: 'idle',
    polishFailure: null,
    polishRecoveryAnswered: false,
    pipelineError: null,
  })
})

afterEach(() => {
  cleanup()
})

describe('useCancelDictationShortcut', () => {
  it.each(['preparing', 'recording', 'transcribing', 'polishing'] as const)(
    'aborts the dictation while %s',
    async (state) => {
      useAppStore.setState({ pipelineState: state })
      render(<Harness />)

      await act(async () => {
        pressEscape()
      })

      expect(abortRecording).toHaveBeenCalledTimes(1)
    },
  )

  it('aborts an Ask dictation with the ask command', async () => {
    useAppStore.setState({ pipelineState: 'ask_recording' })
    render(<Harness />)

    await act(async () => {
      pressEscape()
    })

    expect(abortAskDictation).toHaveBeenCalledTimes(1)
    expect(abortRecording).not.toHaveBeenCalled()
  })

  it('does nothing while idle', async () => {
    render(<Harness />)

    await act(async () => {
      pressEscape()
    })

    expect(abortRecording).not.toHaveBeenCalled()
    expect(submitPolishRecoveryChoice).not.toHaveBeenCalled()
  })

  it('cancels the failed-polish prompt and discards the dictation', async () => {
    useAppStore.setState({
      pipelineState: 'polishing',
      polishFailure: { error: 'HTTP 503', rawTextLength: 20, retryAvailable: true },
    })
    render(<Harness />)

    await act(async () => {
      pressEscape()
    })

    expect(submitPolishRecoveryChoice).toHaveBeenCalledWith('cancel')
    expect(useAppStore.getState().polishFailure).toBeNull()
    // The backend resolves the prompt itself; no second abort is needed.
    expect(abortRecording).not.toHaveBeenCalled()
  })

  it('does not answer an already answered prompt twice but still aborts the retry', async () => {
    useAppStore.setState({
      pipelineState: 'polishing',
      polishFailure: { error: 'HTTP 503', rawTextLength: 20, retryAvailable: true },
      polishRecoveryAnswered: true,
    })
    render(<Harness />)

    await act(async () => {
      pressEscape()
    })

    expect(submitPolishRecoveryChoice).not.toHaveBeenCalled()
    expect(abortRecording).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().polishFailure).toBeNull()
  })

  it('ignores repeated keydowns from a held Escape key', async () => {
    useAppStore.setState({ pipelineState: 'recording' })
    render(<Harness />)

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape', repeat: true })
    })

    expect(abortRecording).not.toHaveBeenCalled()
  })

  it('ignores Escape while a modal dialog owns it', async () => {
    useAppStore.setState({ pipelineState: 'recording' })
    render(<Harness />)

    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)

    await act(async () => {
      pressEscape()
    })

    expect(abortRecording).not.toHaveBeenCalled()
    modal.remove()
  })

  it('ignores Escape typed into an input', async () => {
    useAppStore.setState({ pipelineState: 'recording' })
    const { getByTestId } = render(
      <>
        <Harness />
        <input data-testid="field" />
      </>,
    )

    await act(async () => {
      pressEscape(getByTestId('field'))
    })

    expect(abortRecording).not.toHaveBeenCalled()
  })

  it('does not respond after unmount', async () => {
    useAppStore.setState({ pipelineState: 'recording' })
    const { unmount } = render(<Harness />)
    unmount()

    await act(async () => {
      pressEscape()
    })

    expect(abortRecording).not.toHaveBeenCalled()
  })
})
