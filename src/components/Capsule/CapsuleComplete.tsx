import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import { spring } from '../../lib/animations'

export function CapsuleComplete() {
  const { t } = useTranslation()
  const resetRecording = useAppStore((s) => s.resetRecording)
  const setPipelineState = useAppStore((s) => s.setPipelineState)

  useEffect(() => {
    const timer = setTimeout(() => {
      resetRecording()
      setPipelineState('idle')
    }, 1200)
    return () => clearTimeout(timer)
  }, [resetRecording, setPipelineState])

  const handleDismiss = (event: React.MouseEvent) => {
    event.stopPropagation()
    resetRecording()
    setPipelineState('idle')
  }

  const stopPointerPropagation = (event: React.PointerEvent) => {
    event.stopPropagation()
  }

  return (
    <motion.div className="relative z-10 flex h-full w-full items-center gap-1.5 px-3">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.smooth}
      >
        <Check size={14} className="text-white" />
      </motion.div>
      <span className="min-w-0 flex-1 truncate text-[11px] text-white font-medium">
        {t('capsule.done')}
      </span>
      <button
        onPointerDown={stopPointerPropagation}
        onPointerUp={stopPointerPropagation}
        onClick={handleDismiss}
        aria-label={t('capsule.cancelProcessing')}
        className="shrink-0 rounded-full border-none bg-transparent p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
      >
        <X size={12} />
      </button>
    </motion.div>
  )
}
