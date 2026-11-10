// App metadata
export const UI_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'it', label: 'Italiano' },
] as const

export const APP_NAME = 'TalkWithYourAI'
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'v1.0.20261117'
export const APP_REPO_URL = 'https://github.com/Mutantcat-Working-Group/TalkWithYourAI'
export const APP_LICENSE_URL =
  'https://github.com/Mutantcat-Working-Group/TalkWithYourAI/blob/main/LICENSE'

export const CUSTOM_WHISPER_PROVIDER = 'custom-whisper' as const
export const APPLE_SPEECH_PROVIDER = 'apple-speech' as const
export const CUSTOM_LLM_PROVIDER = 'custom-openai-compatible' as const

export const CUSTOM_STT_DEFAULTS = {
  preset: 'speaches',
  baseUrl: 'http://localhost:8000/v1',
  model: 'Systran/faster-whisper-large-v3',
} as const

export const CUSTOM_STT_PRESETS = [
  {
    value: 'speaches',
    labelKey: 'settings.customSttPresetSpeaches',
    baseUrl: CUSTOM_STT_DEFAULTS.baseUrl,
    model: CUSTOM_STT_DEFAULTS.model,
  },
  {
    value: 'custom',
    labelKey: 'settings.customSttPresetCustom',
  },
] as const

export const STT_PROVIDERS: { value: string; labelKey: string }[] = [
  { value: 'deepgram', labelKey: 'providers.stt.deepgram' },
  { value: 'assemblyai', labelKey: 'providers.stt.assemblyai' },
  { value: 'aliyun-qwen3-asr', labelKey: 'providers.stt.aliyunQwen3Asr' },
  { value: 'volcengine-doubao', labelKey: 'providers.stt.volcengineDoubao' },
  { value: 'glm-asr', labelKey: 'providers.stt.glmAsr' },
  { value: 'openai-whisper', labelKey: 'providers.stt.openaiWhisper' },
  { value: 'groq-whisper', labelKey: 'providers.stt.groqWhisper' },
  { value: 'siliconflow', labelKey: 'providers.stt.siliconflow' },
  { value: APPLE_SPEECH_PROVIDER, labelKey: 'providers.stt.appleSpeech' },
  // Reuse the existing localizable string so the entry is explicit about
  // accepting any OpenAI-compatible transcription endpoint.
  { value: CUSTOM_WHISPER_PROVIDER, labelKey: 'settings.customSttPresetCustom' },
] as const

export const VOLCENGINE_STT_RESOURCES = [
  {
    value: 'volc.seedasr.sauc.duration',
    labelKey: 'settings.volcengineResourceSeedAsr',
  },
  {
    value: 'volc.bigasr.sauc.duration',
    labelKey: 'settings.volcengineResourceBigAsr',
  },
] as const

// Apple Speech is platform-gated and hidden here, but the custom endpoint is
// offered so first-run setup can point at any OpenAI-compatible server.
export const ONBOARDING_STT_PROVIDERS = STT_PROVIDERS.filter(
  (provider) => provider.value !== APPLE_SPEECH_PROVIDER,
)

export const LLM_PROVIDERS: { value: string; labelKey: string }[] = [
  { value: 'zhipu', labelKey: 'providers.llm.zhipu' },
  { value: 'deepseek', labelKey: 'providers.llm.deepseek' },
  { value: 'siliconflow', labelKey: 'providers.llm.siliconflow' },
  { value: 'openai', labelKey: 'providers.llm.openai' },
  { value: 'gemini', labelKey: 'providers.llm.gemini' },
  { value: 'moonshot', labelKey: 'providers.llm.moonshot' },
  { value: 'doubao', labelKey: 'providers.llm.doubao' },
  { value: 'qwen', labelKey: 'providers.llm.qwen' },
  { value: 'groq', labelKey: 'providers.llm.groq' },
  { value: 'claude', labelKey: 'providers.llm.claude' },
  { value: 'ollama', labelKey: 'providers.llm.ollama' },
  { value: 'openrouter', labelKey: 'providers.llm.openrouter' },
  // Reuse the existing localizable string; the i18n bundle is owned separately.
  { value: CUSTOM_LLM_PROVIDER, labelKey: 'settings.customSttPresetCustom' },
] as const

export const ONBOARDING_LLM_PROVIDERS = LLM_PROVIDERS

export const CUSTOM_LLM_DEFAULTS = {
  baseUrl: 'http://localhost:8000/v1',
  model: '',
} as const

export const LLM_DEFAULT_CONFIG: Record<string, { baseUrl: string; model: string }> = {
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  siliconflow: { baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
  },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-1-6-flash-250615',
  },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-0' },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  [CUSTOM_LLM_PROVIDER]: CUSTOM_LLM_DEFAULTS,
}

/**
 * Picks the provider/model values to apply when the user switches LLM provider.
 * Switching to the custom endpoint must not inherit a hosted provider's URL or
 * model, while a previously configured custom endpoint must be preserved.
 */
export function llmDefaultsForProvider(
  provider: string,
  currentBaseUrl: string,
  currentModel: string,
  previousProvider?: string,
): { baseUrl: string; model: string } {
  if (provider === CUSTOM_LLM_PROVIDER) {
    const previousDefault = previousProvider
      ? LLM_DEFAULT_CONFIG[previousProvider]?.baseUrl
      : undefined
    const inheritsHostedDefault =
      previousDefault !== undefined && previousDefault === currentBaseUrl.trim()
    if (inheritsHostedDefault || !currentBaseUrl.trim()) {
      return { baseUrl: CUSTOM_LLM_DEFAULTS.baseUrl, model: CUSTOM_LLM_DEFAULTS.model }
    }
    return {
      baseUrl: currentBaseUrl,
      model: currentModel.trim() ? currentModel : CUSTOM_LLM_DEFAULTS.model,
    }
  }

  const defaults = LLM_DEFAULT_CONFIG[provider]
  return {
    baseUrl: defaults?.baseUrl ?? currentBaseUrl,
    model: defaults?.model ?? currentModel,
  }
}

export function llmProviderRequiresApiKey(provider: string): boolean {
  const normalized = provider.trim().toLowerCase()
  return normalized !== 'ollama' && normalized !== CUSTOM_LLM_PROVIDER
}

export function isCustomLlmProvider(provider: string): boolean {
  return provider.trim().toLowerCase() === CUSTOM_LLM_PROVIDER
}

export const LANGUAGES: { value: string; label?: string; labelKey?: string }[] = [
  { value: 'multi', labelKey: 'settings.autoDetect' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'th', label: 'ไทย' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'pl', label: 'Polski' },
  { value: 'uk', label: 'Українська' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' },
]

export const TARGET_LANGUAGES: { value: string; label: string; labelKey?: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'th', label: 'ไทย' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'pl', label: 'Polski' },
  { value: 'uk', label: 'Українська' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'ms', label: 'Bahasa Melayu' },
]
