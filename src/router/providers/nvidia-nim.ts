import type { ProviderConfig } from './types.js'

export const nvidiaNimConfig: ProviderConfig = {
  name: 'nvidia-nim',
  displayName: 'NVIDIA NIM',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'meta/llama-3.1-70b-instruct',
  freeLimit: '$25 credit',
  contextWindow: 131_072,
  envKey: 'NVIDIA_API_KEY',
  format: 'openai',
  isLocal: false,
  priority: 3,
  status: 'unconfigured',
}
