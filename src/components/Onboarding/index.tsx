import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/appStore'
import { saveOnboardingCompleted, saveOnboardingConfig } from '../../lib/tauri'
import { OnboardingLayout } from './OnboardingLayout'
import { WelcomeStep } from './WelcomeStep'
import { SttSetupStep } from './SttSetupStep'
import { LlmSetupStep } from './LlmSetupStep'
import { PermissionsStep } from './PermissionsStep'
import { QuickTestStep } from './QuickTestStep'
import { DoneStep } from './DoneStep'
import { slideRight } from '../../lib/animations'

const TOTAL_STEPS = 6

export function Onboarding() {
  const { t } = useTranslation()
  const [saveFailed, setSaveFailed] = useState(false)
  const step = useAppStore((s) => s.onboardingStep)
  const setStep = useAppStore((s) => s.setOnboardingStep)
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted)
  const sttTestStatus = useAppStore((s) => s.sttTestStatus)
  const llmTestStatus = useAppStore((s) => s.llmTestStatus)
  const setConfig = useAppStore((s) => s.setConfig)
  const setSavedConfig = useAppStore((s) => s.setSavedConfig)

  const canNext = (() => {
    switch (step) {
      case 0:
        return true // Welcome — always
      case 1:
        return sttTestStatus === 'success' // STT must pass
      case 2:
        return llmTestStatus === 'success' // LLM must pass
      case 3:
        return true // Permissions — optional
      case 4:
        return true // Quick test — optional
      case 5:
        return true // Done
      default:
        return false
    }
  })()

  const titles = [
    { title: t('onboarding.steps.welcome'), subtitle: t('onboarding.steps.welcomeSub') },
    {
      title: t('onboarding.steps.speechRecognition'),
      subtitle: t('onboarding.steps.speechRecognitionSub'),
    },
    { title: t('onboarding.steps.aiPolish'), subtitle: t('onboarding.steps.aiPolishSub') },
    { title: t('onboarding.steps.permissions'), subtitle: t('onboarding.steps.permissionsSub') },
    { title: t('onboarding.steps.howItWorks'), subtitle: t('onboarding.steps.howItWorksSub') },
    { title: t('onboarding.steps.setupComplete'), subtitle: undefined },
  ]

  const config = useAppStore((s) => s.config)

  const saveConfig = async (draft = config) => {
    setSaveFailed(false)
    try {
      return await saveOnboardingConfig(draft)
    } catch (error) {
      setSaveFailed(true)
      throw error
    }
  }

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      try {
        await saveConfig(config)
      } catch {
        // Best-effort save — continue navigation even if save fails
      }

      setStep(step + 1)
    } else {
      try {
        const saved = await saveConfig(config)
        await saveOnboardingCompleted()
        setConfig(saved)
        setSavedConfig(saved)
        setOnboardingCompleted(true)
      } catch {
        setSaveFailed(true)
      }
    }
  }

  const handleBack = async () => {
    if (step > 0) {
      try {
        await saveConfig(config)
      } catch {
        // Best-effort save
      }

      setStep(step - 1)
    }
  }

  const handleSkip = async () => {
    // Skip the remaining setup — finish onboarding with whatever is configured
    try {
      const saved = await saveConfig(config)
      await saveOnboardingCompleted()
      setConfig(saved)
      setSavedConfig(saved)
    } catch {
      setSaveFailed(true)
      return
    }
    setOnboardingCompleted(true)
  }

  return (
    <OnboardingLayout
      step={step}
      totalSteps={TOTAL_STEPS}
      title={titles[step].title}
      subtitle={titles[step].subtitle}
      canNext={canNext}
      canBack={step > 0}
      nextLabel={
        step === TOTAL_STEPS - 1 ? t('onboarding.steps.getStarted') : t('onboarding.layout.next')
      }
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    >
      {saveFailed && (
        <p role="alert" className="mb-3 text-sm text-error">
          {t('common.saveFailed')}
        </p>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideRight}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {step === 0 && <WelcomeStep />}
          {step === 1 && <SttSetupStep />}
          {step === 2 && <LlmSetupStep />}
          {step === 3 && <PermissionsStep />}
          {step === 4 && <QuickTestStep />}
          {step === 5 && <DoneStep />}
        </motion.div>
      </AnimatePresence>
    </OnboardingLayout>
  )
}
