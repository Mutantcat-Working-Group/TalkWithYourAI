import type { PipelineState } from '../stores/appStore'

export interface CapsuleSize {
  width: number
  height: number
}

/** Every visual state the capsule shell can render, including pseudo-states. */
export type CapsuleVisualState = PipelineState | 'error' | 'polish_recovery'

/** Which pipeline states are shared by both size tables. */
export const SHARED_CAPSULE_STATES: readonly PipelineState[] = [
  'idle',
  'preparing',
  'recording',
  'transcribing',
  'polishing',
  'outputting',
  'ask_recording',
  'ask_thinking',
]

/**
 * Size of the visible capsule shell (the jelly pill), not the Tauri window.
 *
 * This is the single source of truth for the pill's own box. The window is
 * sized from `getCapsuleSize` below; if the window is narrower than the shell
 * the shell's right-hand content (usually the cancel buttons) gets clipped.
 * `__tests__/capsuleSize.test.ts` guards the two against drifting apart.
 */
export function getCapsuleShellSize(state: CapsuleVisualState | string): CapsuleSize {
  switch (state) {
    case 'idle':
      return { width: 36, height: 36 }
    case 'preparing':
      return { width: 180, height: 36 }
    case 'outputting':
      return { width: 144, height: 36 }
    case 'ask_recording':
    case 'ask_thinking':
      // Widest row: px-3 * 2 (24) + icon (13) + localized title + work dots
      // (18) + optional timer (34) + cancel (20) + 4-5 gaps of 8 (40).
      // The longest title is "Demander" (fr) / "Спросить" (ru) at ~49px, and
      // "Sto pensando" (it) needs another 64, so the row reaches ~204px. The
      // old 168 clipped the cancel button; 224 keeps both buttons on-screen.
      return { width: 224, height: 36 }
    case 'recording':
    case 'transcribing':
    case 'polishing':
    case 'error':
      return { width: 200, height: 36 }
    case 'polish_recovery':
      // 12px padding * 2 + 44 title ("润色失败") + 3 gaps * 6 + 3 * 24 icon
      // buttons = 158px; 232 leaves ~74px for longer localized titles.
      return { width: 232, height: 36 }
    default:
      return { width: 36, height: 36 }
  }
}

/**
 * Window size for a capsule state, in logical pixels.
 *
 * The window holds the shell at `left-3` (12px) plus a 12px right/bottom
 * margin, so `useCapsuleResize` adds 24 to each dimension. Shared states
 * therefore reuse the shell table unchanged rather than repeating numbers.
 *
 * Menu/expanded overrides are window-only: the shell keeps its normal size
 * while the window grows to fit the menu next to it.
 */
export function getCapsuleSize(
  state: PipelineState,
  expanded: boolean,
  hasError: boolean,
  contextMenuOpen: boolean,
  translationTargetMenuOpen = false,
  hasPolishPrompt = false,
): CapsuleSize {
  if (translationTargetMenuOpen) return { width: 360, height: 180 }
  if (contextMenuOpen) return { width: 220, height: 220 }
  if (hasPolishPrompt) return getCapsuleShellSize('polish_recovery')
  if (hasError) return getCapsuleShellSize('error')
  if (expanded) return { width: 220, height: 90 }
  return getCapsuleShellSize(state)
}
