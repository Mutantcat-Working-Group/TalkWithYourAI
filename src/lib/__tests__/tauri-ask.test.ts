import { describe, expect, it, vi, beforeEach } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import {
  askAnything,
  showAskWindow,
  startAskDictation,
  startAskFlow,
  stopAskFlow,
  submitPolishRecoveryChoice,
  takePendingAskMessage,
  updateAskHotkey,
} from '../tauri'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('Ask Anything Tauri wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invokes the ask_anything command with the trimmed question', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('A short answer.')

    const answer = await askAnything('  What is TalkWithYourAI?  ')

    expect(answer).toBe('A short answer.')
    expect(invoke).toHaveBeenCalledWith('ask_anything', { question: 'What is TalkWithYourAI?' })
  })

  it('invokes the ask hotkey update command independently from dictation hotkey', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined)

    await updateAskHotkey('Ctrl+.')

    expect(invoke).toHaveBeenCalledWith('update_ask_hotkey', { hotkey: 'Ctrl+.' })
  })

  it('opens the native Ask floating window', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined)

    await showAskWindow()

    expect(invoke).toHaveBeenCalledWith('show_ask_window')
  })

  it('starts the voice-first Ask flow', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined)

    await startAskFlow()

    expect(invoke).toHaveBeenCalledWith('start_ask_flow')
  })

  it('stops the voice-first Ask flow', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined)

    await stopAskFlow()

    expect(invoke).toHaveBeenCalledWith('stop_ask_flow')
  })

  it('reads and clears pending Ask popup messages from Tauri', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      kind: 'result',
      payload: { question: 'Q', answer: 'A' },
    })

    const pending = await takePendingAskMessage()

    expect(pending).toEqual({
      kind: 'result',
      payload: { question: 'Q', answer: 'A' },
    })
    expect(invoke).toHaveBeenCalledWith('take_pending_ask_message')
  })

  it('starts Ask dictation and returns recording metadata', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      usedSelectedText: true,
      selectedTextTruncated: false,
    })

    await expect(startAskDictation()).resolves.toEqual({
      usedSelectedText: true,
      selectedTextTruncated: false,
    })
    expect(invoke).toHaveBeenCalledWith('start_ask_dictation')
  })

  it.each(['retry', 'insert_raw', 'cancel'] as const)(
    'submits the %s polish recovery choice',
    async (choice) => {
      vi.mocked(invoke).mockResolvedValueOnce(true)

      await expect(submitPolishRecoveryChoice(choice)).resolves.toBe(true)

      expect(invoke).toHaveBeenCalledWith('submit_polish_recovery_choice', { choice })
    },
  )

  it('reports when the backend is no longer waiting for a polish answer', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(false)

    await expect(submitPolishRecoveryChoice('cancel')).resolves.toBe(false)
  })
})
