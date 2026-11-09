import { describe, expect, it } from 'vitest'
import {
  CUSTOM_LLM_PROVIDER,
  CUSTOM_WHISPER_PROVIDER,
  LLM_PROVIDERS,
  STT_PROVIDERS,
  isCustomLlmProvider,
  llmDefaultsForProvider,
  llmProviderRequiresApiKey,
} from '../constants'

describe('custom OpenAI-compatible LLM provider', () => {
  it('is offered in the provider list', () => {
    expect(LLM_PROVIDERS.some((provider) => provider.value === CUSTOM_LLM_PROVIDER)).toBe(true)
    expect(isCustomLlmProvider(CUSTOM_LLM_PROVIDER)).toBe(true)
    expect(isCustomLlmProvider(' Custom-OpenAI-Compatible ')).toBe(true)
    expect(isCustomLlmProvider('openai')).toBe(false)
  })

  it('does not require an API key so self-hosted endpoints keep working', () => {
    expect(llmProviderRequiresApiKey(CUSTOM_LLM_PROVIDER)).toBe(false)
    expect(llmProviderRequiresApiKey('ollama')).toBe(false)
    expect(llmProviderRequiresApiKey('openai')).toBe(true)
  })

  it('starts from a local default instead of inheriting a hosted provider URL', () => {
    expect(
      llmDefaultsForProvider(
        CUSTOM_LLM_PROVIDER,
        'https://api.openai.com/v1',
        'gpt-4o-mini',
        'openai',
      ),
    ).toEqual({ baseUrl: 'http://localhost:8000/v1', model: '' })
  })

  it('preserves an already configured custom endpoint', () => {
    expect(
      llmDefaultsForProvider(
        CUSTOM_LLM_PROVIDER,
        'http://192.168.1.9:8000/v1',
        'local-model',
        'openai',
      ),
    ).toEqual({ baseUrl: 'http://192.168.1.9:8000/v1', model: 'local-model' })
  })

  it('applies hosted defaults when leaving the custom provider', () => {
    expect(llmDefaultsForProvider('openai', 'http://localhost:8000/v1', 'local-model')).toEqual({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    })
  })
})

describe('custom STT provider', () => {
  it('is offered as a dedicated provider entry', () => {
    expect(STT_PROVIDERS.some((provider) => provider.value === CUSTOM_WHISPER_PROVIDER)).toBe(true)
  })
})
