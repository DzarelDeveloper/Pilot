export interface ProviderKeysGemini {
  apiKey: string
}

export interface ProviderKeysQwen {
  apiKey: string
}

export interface ProviderKeysNvidiaNim {
  apiKey: string
}

export interface ProviderKeysOpenrouter {
  apiKey: string
}

export interface ProviderKeysCloudflare {
  apiKey: string
  accountId: string
}

export interface ProviderKeysKiro {
  apiKey: string
}

export interface ProviderKeysIflow {
  apiKey: string
}

export interface ProviderKeysOpencode {
  apiKey: string
}

export interface ProviderKeysOllama {
  enabled: boolean
  model: string
  baseUrl: string
}

export interface ProvidersConfig {
  gemini?: ProviderKeysGemini
  qwen?: ProviderKeysQwen
  nvidiaNim?: ProviderKeysNvidiaNim
  openrouter?: ProviderKeysOpenrouter
  cloudflare?: ProviderKeysCloudflare
  kiro?: ProviderKeysKiro
  iflow?: ProviderKeysIflow
  opencode?: ProviderKeysOpencode
  ollama?: ProviderKeysOllama
}

export interface PilotConfig {
  providers: ProvidersConfig
  providerPriority?: string[]
  defaultMode?: 'code' | 'chat'
}
