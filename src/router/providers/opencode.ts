import type { ProviderConfig } from './types.js'

export const opencodeConfig: ProviderConfig = {
  name: 'opencode',
  displayName: 'OpenCode',
  baseUrl: 'https://api.opencode.ai/v1',
  model: 'opencode-default',
  freeLimit: 'free',
  contextWindow: 32_768,
  envKey: 'OPENCODE_API_KEY',
  format: 'openai',
  isLocal: false,
  priority: 8,
  status: 'unconfigured',
}
