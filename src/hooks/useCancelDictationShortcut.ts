import { useEffect } from 'react'
import { useAppStore, type PipelineState } from '../stores/appStore'
import { abortAskDictation, abortRecording, submitPolishRecoveryChoice } from '../lib/tauri'

const CANCELLABLE_STATES: PipelineState[] = [
  'preparing',
  'recording',
  'transcribing',
  'polishing',
  'ask_recording',
  'ask_thinking',
]

/**
 * Cancels the current dictation exactly like the capsule's X button.
 *
 * NOTE: this is a document-level handler, so it only fires while one of our
 * windows has keyboard focus. A truly global binding needs a src-tauri change
 * (see the hotkey registration path in src-tauri/src/hotkey.rs).
 */
export async function cancelActiveDictation(): Promise<void> {
  const state = useAppStore.getState()

  if (state.polishFailure) {
    // The backend is waiting for an answer to the failed-polish prompt;
    // cancelling discards the dictation and nothing is inserted.
    if (!state.polishRecoveryAnswered) {
      state.setPolishRecoveryAnswered(true)
      try {
        const accepted = await submitPolishRecoveryChoice('cancel')
        state.clearPolishFailure()
        if (accepted) return
        // Nobody was waiting any more: fall through and abort the pipeline.
      } catch (error) {
        console.error('Failed to cancel the failed-polish prompt:', error)
        state.clearPolishFailure()
      }
    } else {
      state.clearPolishFailure()
    }
  }

  const pipelineState = useAppStore.getState().pipelineState
  if (!CANCELLABLE_STATES.includes(pipelineState)) return

  try {
    if (pipelineState === 'ask_recording' || pipelineState === 'ask_thinking') {
      await abortAskDictation()
    } else {
      await abortRecording()
    }
  } catch (error) {
    console.error('Failed to cancel the current dictation:', error)
  }
}

function isBlockedByForegroundUi(event: Event) {
  // Let open menus and modal dialogs (settings, history) consume Escape first.
  if (event.defaultPrevented) return true
  // Menus and modal dialogs open in our windows handle Escape themselves.
  if (document.querySelector('[aria-modal="true"], [role="menu"]')) return true
  const target = event.target
  if (target instanceof HTMLElement) {
    const tag = target.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
      return true
    }
  }
  return false
}

export function useCancelDictationShortcut(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      if (isBlockedByForegroundUi(event)) return

      const state = useAppStore.getState()
      const pipelineActive =
        CANCELLABLE_STATES.includes(state.pipelineState) ||
        // The backend holds the polishing state while the prompt is waiting,
        // but be defensive in case a state event lags behind.
        state.polishFailure !== null
      if (!pipelineActive) return

      event.preventDefault()
      void cancelActiveDictation()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
