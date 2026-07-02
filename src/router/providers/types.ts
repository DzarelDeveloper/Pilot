import type { Message } from '../../memory/types.js'

export type ProviderStatus = 'active' | 'rate-limited' | 'error' | 'unconfigured' | 'not-installed'
export type ProviderFormat = 'openai' | 'google'

export interface ProviderConfig {
  name: string
  displayName: string
  baseUrl: string
  model: string
  freeLimit: number | string
  contextWindow: number
  envKey: string | null
  envExtra?: string
  format: ProviderFormat
  headers?: Record<string, string>
  isLocal: boolean
  autoDetect?: boolean
  installUrl?: string
  recommendedModels?: string[]
  priority: number
  status: ProviderStatus
  rateLimitResetAt?: Date
}

export interface ProviderRequest {
  messages: Message[]
  maxTokens?: number
  temperature?: number
}

export interface ProviderResponse {
  content: string
  provider: string
  model: string
  tokensUsed: number
  isLocal: boolean
}

export interface OllamaStatus {
  available: boolean
  models?: string[]
  activeModel?: string
}

export interface OllamaTagsResponse {
  models?: Array<{ name: string }>
}
