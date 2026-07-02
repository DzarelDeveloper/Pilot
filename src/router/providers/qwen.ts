import type { ProviderConfig } from './types.js'

export const qwenConfig: ProviderConfig = {
  name: 'qwen',
  displayName: 'Qwen',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-plus',
  freeLimit: 'generous',
  contextWindow: 131_072,
  envKey: 'QWEN_API_KEY',
  format: 'openai',
  isLocal: false,
  priority: 2,
  status: 'unconfigured',
}
