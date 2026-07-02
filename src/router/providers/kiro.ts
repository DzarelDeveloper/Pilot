import type { ProviderConfig } from './types.js'

export const kiroConfig: ProviderConfig = {
  name: 'kiro',
  displayName: 'Kiro AI',
  baseUrl: 'https://api.kiro.ai/v1',
  model: 'kiro-default',
  freeLimit: 'free tier',
  contextWindow: 32_768,
  envKey: 'KIRO_API_KEY',
  format: 'openai',
  isLocal: false,
  priority: 6,
  status: 'unconfigured',
}
