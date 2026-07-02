import type { ProviderConfig } from './types.js'

export const openrouterConfig: ProviderConfig = {
  name: 'openrouter',
  displayName: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'mistralai/mistral-7b-instruct:free',
  freeLimit: 'rate-limited',
  contextWindow: 32_768,
  envKey: 'OPENROUTER_API_KEY',
  format: 'openai',
  headers: {
    'HTTP-Referer': 'https://pilot-ai.dev',
    'X-Title': 'Pilot',
  },
  isLocal: false,
  priority: 4,
  status: 'unconfigured',
}
