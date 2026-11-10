import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { RotateCw, X } from 'lucide-react'
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
      className="pointer-events-auto flex h-full w-full flex-col justify-center bg-transparent p-3 text-white"
      onPointerDown={stopPointerPropagation}
      onPointerUp={stopPointerPropagation}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-white/90">
          {t('polishRecovery.title')}
        </p>
        <button
          type="button"
          onClick={() => choose('cancel')}
          disabled={answered}
          aria-label={t('polishRecovery.cancel')}
          className="shrink-0 rounded-full border-none bg-transparent p-1 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-default disabled:opacity-50 cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {prompt.retryAvailable && (
          <button
            type="button"
            onClick={() => choose('retry')}
            disabled={answered}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border-none bg-white px-2 py-1.5 text-[11px] font-medium text-neutral-900 transition-opacity hover:bg-white/90 disabled:cursor-default disabled:opacity-60 cursor-pointer"
          >
            <RotateCw size={11} />
            {t('polishRecovery.retry')}
          </button>
        )}
        <button
          type="button"
          onClick={() => choose('insert_raw')}
          disabled={answered}
          className="flex flex-1 items-center justify-center rounded-[9px] border border-white/15 bg-white/10 px-2 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/18 disabled:cursor-default disabled:opacity-60 cursor-pointer"
        >
          {t('polishRecovery.insertRaw')}
        </button>
      </div>
    </motion.div>
  )
}
