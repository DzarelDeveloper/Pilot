import type { ProviderConfig } from './types.js'

export const iflowConfig: ProviderConfig = {
  name: 'iflow',
  displayName: 'iFlow',
  baseUrl: 'https://api.iflow.ai/v1',
  model: 'iflow-default',
  freeLimit: 'free tier',
  contextWindow: 32_768,
  envKey: 'IFLOW_API_KEY',
  format: 'openai',
  isLocal: false,
  priority: 7,
  status: 'unconfigured',
}
