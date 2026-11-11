import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ClipboardPaste, RotateCw, X } from 'lucide-react'
import { submitPolishRecoveryChoice, type PolishRecoveryChoice } from '../../lib/tauri'
import { useAppStore } from '../../stores/appStore'

export function PolishRecoveryPrompt() {
  const { t } = useTranslation()
  const prompt = useAppStore((s) => s.polishFailure)
  const answered = useAppStore((s) => s.polishRecoveryAnswered)
  const setAnswered = useAppStore((s) => s.setPolishRecoveryAnswered)
  const clearPrompt = useAppStore((s) => s.clearPolishFailure)

  if (!prompt) return null

  const choose = async (choice: PolishRecoveryChoice) => {
    // Read through the store so a rapid double click cannot answer twice.
    if (useAppStore.getState().polishRecoveryAnswered) return
    setAnswered(true)
    try {
      await submitPolishRecoveryChoice(choice)
    } catch (error) {
      console.error('Failed to submit polish recovery choice:', error)
    }
    // Retry keeps the prompt visible: the backend loops and may fail again,
    // which re-arms this prompt. Any other choice resolves it.
    if (choice !== 'retry' && useAppStore.getState().polishFailure === prompt) {
      clearPrompt()
    }
  }

  const stopPointerPropagation = (event: React.PointerEvent) => {
    event.stopPropagation()
  }

  return (
    <motion.div
      role="dialog"
      aria-label={t('polishRecovery.title')}
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
      className="pointer-events-auto flex h-full w-full items-center gap-1.5 bg-transparent px-3 text-white"
      onPointerDown={stopPointerPropagation}
      onPointerUp={stopPointerPropagation}
    >
      <p className="min-w-0 flex-1 truncate text-[11px] font-medium leading-snug text-white/90">
        {t('polishRecovery.title')}
      </p>
      {prompt.retryAvailable && (
        <button
          type="button"
          onClick={() => choose('retry')}
          disabled={answered}
          aria-label={t('polishRecovery.retry')}
          title={t('polishRecovery.retry')}
          className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-white text-neutral-900 transition-opacity hover:bg-white/90 disabled:cursor-default disabled:opacity-60"
        >
          <RotateCw size={12} />
        </button>
      )}
      <button
        type="button"
        onClick={() => choose('insert_raw')}
        disabled={answered}
        aria-label={t('polishRecovery.insertRaw')}
        title={t('polishRecovery.insertRaw')}
        className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-default disabled:opacity-60"
      >
        <ClipboardPaste size={12} />
      </button>
      <button
        type="button"
        onClick={() => choose('cancel')}
        disabled={answered}
        aria-label={t('polishRecovery.cancel')}
        title={t('polishRecovery.cancel')}
        className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-transparent text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-default disabled:opacity-50"
      >
        <X size={12} />
      </button>
    </motion.div>
  )
}
