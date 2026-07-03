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

import { getProviderPlugins } from '../../plugins/manager.js'

/**
 * Get providers with their status resolved from config.
 * Includes dynamically loaded provider plugins.
 */
export function getResolvedProviders(): ProviderConfig[] {
  const builtIns = allProviders.map((p) => ({
    ...p,
    status: isProviderConfigured(p.name) ? 'active' as const : 'unconfigured' as const,
  }))

  const pluginProviders = getProviderPlugins().map((p) => ({
    name: p.manifest.name,
    displayName: p.manifest.name,
    baseUrl: '', // Not strictly needed for plugins if they handle it
    model: 'plugin-model',
    freeLimit: 'Custom',
    contextWindow: 128000,
    envKey: null,
    format: 'openai' as const,
    isLocal: true, // Treat as local to avoid strict API key checks
    priority: 99, // default lowest priority unless overridden
    status: 'active' as const,
    isPlugin: true,
  }))

  return [...builtIns, ...pluginProviders]
}

export type { ProviderConfig } from './types.js'
export type { ProviderRequest, ProviderResponse, OllamaStatus } from './types.js'
