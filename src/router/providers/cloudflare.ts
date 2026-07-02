import type { ProviderConfig } from './types.js'

export const cloudflareConfig: ProviderConfig = {
  name: 'cloudflare',
  displayName: 'Cloudflare AI',
  baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1',
  model: '@cf/meta/llama-3.1-8b-instruct',
  freeLimit: 10_000,
  contextWindow: 8_192,
  envKey: 'CLOUDFLARE_API_KEY',
  envExtra: 'CLOUDFLARE_ACCOUNT_ID',
  format: 'openai',
  isLocal: false,
  priority: 5,
  status: 'unconfigured',
}
