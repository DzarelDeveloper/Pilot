import { geminiConfig } from './gemini.js'
import { qwenConfig } from './qwen.js'
import { nvidiaNimConfig } from './nvidia-nim.js'
import { openrouterConfig } from './openrouter.js'
import { cloudflareConfig } from './cloudflare.js'
import { kiroConfig } from './kiro.js'
import { iflowConfig } from './iflow.js'
import { opencodeConfig } from './opencode.js'
import { ollamaConfig } from './ollama.js'
import type { ProviderConfig } from './types.js'
import { isProviderConfigured } from '../../config/index.js'

/** All 9 provider configs (uninitialized — status set at runtime) */
export const allProviders: ProviderConfig[] = [
  geminiConfig,
  qwenConfig,
  nvidiaNimConfig,
  openrouterConfig,
  cloudflareConfig,
  kiroConfig,
  iflowConfig,
  opencodeConfig,
  ollamaConfig,
]

/**
 * Get providers with their status resolved from config.
 * This is lazy — only called when needed.
 */
export function getResolvedProviders(): ProviderConfig[] {
  return allProviders.map((p) => ({
    ...p,
    status: isProviderConfigured(p.name) ? 'active' as const : 'unconfigured' as const,
  }))
}

export type { ProviderConfig } from './types.js'
export type { ProviderRequest, ProviderResponse, OllamaStatus } from './types.js'
