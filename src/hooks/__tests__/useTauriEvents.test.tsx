import { StrictMode } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTauriEvents } from '../useTauriEvents'
import { useAppStore } from '../../stores/appStore'
import { toast } from '../../components/toast-service'

const eventListeners = vi.hoisted(() => new Map<string, (event: { payload: unknown }) => void>())

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((event: string, handler: (event: { payload: unknown }) => void) => {
    eventListeners.set(event, handler)
    return Promise.resolve(vi.fn())
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}))

vi.mock('../../lib/tauri', () => ({
  getHistory: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../components/toast-service', () => ({
  toast: vi.fn(),
}))

function HookHarness() {
  useTauriEvents()
  return null
}

describe('useTauriEvents', () => {
  beforeEach(() => {
    eventListeners.clear()
    useAppStore.setState({
      hotkeyRegistrationError: null,
      lastContext: null,
      activeVoiceMode: null,
      polishFailure: null,
      polishRecoveryAnswered: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('clears hotkey registration errors when the backend reports recovery', async () => {
    render(<HookHarness />)

    await waitFor(() => {
      expect(eventListeners.has('hotkey:registration-failed')).toBe(true)
    })

    act(() => {
      eventListeners.get('hotkey:registration-failed')?.({ payload: 'Shortcut occupied' })
    })
    expect(useAppStore.getState().hotkeyRegistrationError).toBe('Shortcut occupied')

    await waitFor(() => {
      expect(eventListeners.has('hotkey:registration-recovered')).toBe(true)
    })

    act(() => {
      eventListeners.get('hotkey:registration-recovered')?.({ payload: undefined })
    })
    expect(useAppStore.getState().hotkeyRegistrationError).toBeNull()
  })

  it('clears stale capsule errors when a new pipeline run starts preparing', async () => {
    useAppStore.setState({ pipelineError: 'Previous failure' })
    render(<HookHarness />)

    await waitFor(() => {
      expect(eventListeners.has('pipeline:state')).toBe(true)
    })

    act(() => {
      eventListeners.get('pipeline:state')?.({ payload: 'preparing' })
    })

    expect(useAppStore.getState().pipelineError).toBeNull()
  })

  it('does not register a cloud session-invalid listener', async () => {
    render(
      <StrictMode>
        <HookHarness />
      </StrictMode>,
    )

    await waitFor(() => expect(eventListeners.has('pipeline:state')).toBe(true))
    expect(eventListeners.has('auth:session-invalid')).toBe(false)
  })

  it('stores only the safe context summary emitted for the completed operation', async () => {
    render(<HookHarness />)

    await waitFor(() => {
      expect(eventListeners.has('pipeline:context')).toBe(true)
    })

    act(() => {
      eventListeners.get('pipeline:context')?.({
        payload: {
          profileId: 'chat.slack',
          family: 'work_chat',
          appLabel: 'Slack',
          iconKey: 'slack',
          overrideId: 'slack',
        },
      })
    })

    expect(useAppStore.getState().lastContext).toEqual({
      profileId: 'chat.slack',
      family: 'work_chat',
      appLabel: 'Slack',
      iconKey: 'slack',
      overrideId: 'slack',
    })
  })

  it('tracks the operation voice mode without inferring it from pipeline state', async () => {
    render(<HookHarness />)

    await waitFor(() => {
      expect(eventListeners.has('pipeline:voice_mode')).toBe(true)
    })

    act(() => {
      eventListeners.get('pipeline:voice_mode')?.({ payload: 'translate' })
    })
    expect(useAppStore.getState().activeVoiceMode).toBe('translate')

    act(() => {
      eventListeners.get('pipeline:voice_mode')?.({ payload: null })
    })
    expect(useAppStore.getState().activeVoiceMode).toBeNull()
  })

  it('records a pipeline error without surfacing a cloud incident banner', async () => {
    render(<HookHarness />)
    await waitFor(() => expect(eventListeners.has('pipeline:error')).toBe(true))

    act(() => {
      eventListeners.get('pipeline:error')?.({
        payload: { code: 'stt_failed', details: 'HTTP 503' },
      })
    })

    expect(useAppStore.getState().pipelineError).toBe('capsule.errors.stt_failed')
  })

  it('clears a previous error when the pipeline restarts', async () => {
    useAppStore.setState({ pipelineError: 'Previous failure' })
    render(<HookHarness />)
    await waitFor(() => expect(eventListeners.has('pipeline:state')).toBe(true))

    act(() => {
      eventListeners.get('pipeline:state')?.({ payload: 'preparing' })
    })
    expect(useAppStore.getState().pipelineError).toBeNull()
  })

  it('shows deadline warnings and explains an automatic graceful stop', async () => {
    render(<HookHarness />)

    await waitFor(() => {
      expect(eventListeners.has('recording:deadline-warning')).toBe(true)
      expect(eventListeners.has('recording:deadline-reached')).toBe(true)
    })

    const base = {
      sessionId: 7,
      recordingKind: 'dictation',
      effectiveMaxSeconds: 600,
      providerId: 'glm-asr',
      explanationKey: 'recordingLimits.reasons.providerDuration',
    }
    act(() => {
      eventListeners.get('recording:deadline-warning')?.({
        payload: { ...base, secondsRemaining: 10 },
      })
      eventListeners.get('recording:deadline-reached')?.({ payload: base })
    })

    expect(toast).toHaveBeenNthCalledWith(1, 'recordingLimits.deadlineWarning', 'info')
    expect(toast).toHaveBeenNthCalledWith(2, 'recordingLimits.deadlineReached', 'info')
  })

  it('shows the failed-polish prompt on llm:polish-failed and re-arms on a second failure', async () => {
    render(<HookHarness />)
    await waitFor(() => expect(eventListeners.has('llm:polish-failed')).toBe(true))

    act(() => {
      eventListeners.get('llm:polish-failed')?.({
        payload: { error: 'HTTP 503', rawTextLength: 42, retryAvailable: true },
      })
    })
    expect(useAppStore.getState().polishFailure).toEqual({
      error: 'HTTP 503',
      rawTextLength: 42,
      retryAvailable: true,
    })

    act(() => {
      useAppStore.getState().setPolishRecoveryAnswered(true)
      eventListeners.get('llm:polish-failed')?.({
        payload: { error: 'HTTP 504', rawTextLength: 42, retryAvailable: true },
      })
    })
    expect(useAppStore.getState().polishFailure?.error).toBe('HTTP 504')
    expect(useAppStore.getState().polishRecoveryAnswered).toBe(false)
  })

  it('hides a stale pipeline error when the polish prompt appears', async () => {
    useAppStore.setState({ pipelineError: 'Previous failure' })
    render(<HookHarness />)
    await waitFor(() => expect(eventListeners.has('llm:polish-failed')).toBe(true))

    act(() => {
      eventListeners.get('llm:polish-failed')?.({
        payload: { error: 'HTTP 503', rawTextLength: 12, retryAvailable: true },
      })
    })

    expect(useAppStore.getState().pipelineError).toBeNull()
    expect(useAppStore.getState().polishFailure).not.toBeNull()
  })

  it('clears the failed-polish prompt when the pipeline leaves polishing', async () => {
    render(<HookHarness />)
    await waitFor(() => expect(eventListeners.has('pipeline:state')).toBe(true))

    act(() => {
      eventListeners.get('llm:polish-failed')?.({
        payload: { error: 'HTTP 503', rawTextLength: 12, retryAvailable: true },
      })
    })
    expect(useAppStore.getState().polishFailure).not.toBeNull()

    act(() => {
      eventListeners.get('pipeline:state')?.({ payload: 'outputting' })
    })
    expect(useAppStore.getState().polishFailure).toBeNull()
    expect(useAppStore.getState().polishRecoveryAnswered).toBe(false)
  })

  it('keeps the failed-polish prompt across polishing state re-emissions', async () => {
    render(<HookHarness />)
    await waitFor(() => expect(eventListeners.has('pipeline:state')).toBe(true))

    act(() => {
      eventListeners.get('pipeline:state')?.({ payload: 'polishing' })
      eventListeners.get('llm:polish-failed')?.({
        payload: { error: 'HTTP 503', rawTextLength: 12, retryAvailable: true },
      })
      eventListeners.get('pipeline:state')?.({ payload: 'polishing' })
    })
    expect(useAppStore.getState().polishFailure).not.toBeNull()
  })

  it('refreshes history on idle without any subscription polling', async () => {
    render(<HookHarness />)

    await waitFor(() => expect(eventListeners.has('pipeline:state')).toBe(true))
    act(() => {
      eventListeners.get('pipeline:state')?.({ payload: 'preparing' })
      eventListeners.get('pipeline:state')?.({ payload: 'recording' })
      eventListeners.get('pipeline:state')?.({ payload: 'idle' })
    })

    expect(eventListeners.has('auth:session-invalid')).toBe(false)
  })
})
