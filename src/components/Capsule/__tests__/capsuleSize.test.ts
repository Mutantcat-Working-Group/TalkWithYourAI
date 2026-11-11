import { describe, expect, it } from 'vitest'
import {
  getCapsuleSize,
  getCapsuleShellSize,
  SHARED_CAPSULE_STATES,
  type CapsuleVisualState,
} from '../../../lib/capsuleSize'

/**
 * The window comes from `getCapsuleSize` (hooks/useCapsuleResize.ts) while the
 * jelly shell comes from `getCapsuleShellSize`. When the window is narrower
 * than the shell, the shell's right-side buttons are clipped off-screen. That
 * is exactly what happened to the failed-polish prompt: the hook said 232x36
 * while the shell still said 300x80, so the pill rendered taller than every
 * other state and lost its right-hand buttons.
 *
 * The values below are the agreed spec, pinned so neither table can be edited
 * without this test failing.
 */
const SPEC: Record<CapsuleVisualState, { width: number; height: number }> = {
  idle: { width: 36, height: 36 },
  preparing: { width: 180, height: 36 },
  recording: { width: 200, height: 36 },
  transcribing: { width: 200, height: 36 },
  polishing: { width: 200, height: 36 },
  outputting: { width: 144, height: 36 },
  ask_recording: { width: 224, height: 36 },
  ask_thinking: { width: 224, height: 36 },
  error: { width: 200, height: 36 },
  polish_recovery: { width: 232, height: 36 },
}

describe('getCapsuleShellSize', () => {
  it('matches the agreed spec for every visual state', () => {
    for (const [state, expected] of Object.entries(SPEC)) {
      expect(getCapsuleShellSize(state), state).toEqual(expected)
    }
  })

  it('falls back to the idle bubble for an unknown state', () => {
    expect(getCapsuleShellSize('nonsense')).toEqual(SPEC.idle)
  })
})

describe('getCapsuleSize', () => {
  it('matches the shell spec for every shared pipeline state', () => {
    for (const state of SHARED_CAPSULE_STATES) {
      expect(getCapsuleSize(state, false, false, false), state).toEqual(SPEC[state])
    }
  })

  it('matches the shell spec for the error and polish-recovery states', () => {
    expect(getCapsuleSize('idle', false, true, false)).toEqual(SPEC.error)
    expect(getCapsuleSize('idle', false, false, false, false, true)).toEqual(SPEC.polish_recovery)
  })

  it('honours the window-only overrides the shell has no equivalent for', () => {
    expect(getCapsuleSize('recording', false, false, true)).toEqual({ width: 220, height: 220 })
    expect(getCapsuleSize('recording', false, false, false, true)).toEqual({
      width: 360,
      height: 180,
    })
    expect(getCapsuleSize('idle', true, false, false)).toEqual({ width: 220, height: 90 })
  })

  it('keeps every shell inside the window the hook builds', () => {
    // useCapsuleResize adds 24 logical px of padding around the shell.
    for (const state of SHARED_CAPSULE_STATES) {
      const shell = getCapsuleShellSize(state)
      const windowSize = getCapsuleSize(state, false, false, false)
      expect(windowSize.width + 24, state).toBeGreaterThanOrEqual(shell.width + 24)
      expect(windowSize.height, state).toBe(shell.height)
    }
  })

  it('leaves room for the translation-target menu beside the recording pill', () => {
    // The menu is absolutely positioned at left-[216px] and 148px wide, so it
    // ends at 364px inside the window content box. The shell occupies
    // left-3 (12px) + 200px, leaving a 4px gap before the menu.
    const { width } = getCapsuleSize('recording', false, false, false, true)
    const shell = getCapsuleShellSize('recording')
    expect(12 + shell.width).toBeLessThanOrEqual(216)
    // useCapsuleResize adds 24px of padding to the window it creates.
    expect(width + 24).toBeGreaterThanOrEqual(216 + 148)
  })
})

describe('content budget', () => {
  // Widest measured content row per state, in logical px, from the 11px
  // labels in src/i18n/locales/*.json and the fixed-size children of each
  // Capsule*.tsx. Each state must stay at or under its declared width.
  const REQUIRED: Partial<Record<CapsuleVisualState, number>> = {
    // px-3*2 (24) + gap-1.5*3 (18) + 3 * h-6 button (72) + 44px "润色失败".
    // Worst localized title is 142px (ru), which fits the 118px text slot
    // because the title truncates; the three buttons never do.
    polish_recovery: 158,
    // px-3*2 + icon 13 + gap-2*5 (40) + title 48.4 (fr) + dots 18
    // + timer 34 ("60:00", the custom limit cap) + cancel 20.
    ask_recording: 197,
    // Same row without the timer but with ask.thinking: px-3*2 + icon 13
    // + gap-2*4 (32) + title 48.4 + dots 18 + "Sto pensando" 63.6 + cancel 20.
    ask_thinking: 195,
    // px-3*2 + dot 8 + gap 8 + work dots 18 + gap 8 + text 100 (it)
    // + caret 2 + gap 8 + cancel 20.
    transcribing: 196,
    // px-3*2 + dots 18 + gap 8 + "Sto pensando" 104.2 + gap 8 + cancel 20.
    polishing: 182,
    // px-3*2 + check 14 + gap 6 + "Terminé" 36.5 + gap 6 + cancel 20.
    outputting: 107,
  }

  it.each(Object.entries(REQUIRED))('fits %s content', (state, required) => {
    const { width } = getCapsuleShellSize(state as CapsuleVisualState)
    expect(width, state).toBeGreaterThanOrEqual(required as number)
  })

  it('never grows the shell height beyond the 36px pill', () => {
    for (const [state, size] of Object.entries(SPEC)) {
      expect(size.height, state).toBe(36)
    }
  })
})
