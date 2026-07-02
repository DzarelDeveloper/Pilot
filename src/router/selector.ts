import { getResolvedProviders } from './providers/index.js'
import type { ProviderConfig } from './providers/types.js'
import { detectOllama } from './providers/ollama.js'
import { getConfig } from '../config/index.js'

/**
 * Get providers sorted by priority, skip unconfigured and not-installed.
 * Respects user's custom providerPriority from config.
 */
export function getProvidersByPriority(): ProviderConfig[] {
  const config = getConfig()
  const providers = getResolvedProviders()
  const userPriority = config.providerPriority

  if (userPriority && userPriority.length > 0) {
    // Sort by user priority order
    const prioritized: ProviderConfig[] = []
    for (const name of userPriority) {
      const found = providers.find((p) => p.name === name)
      if (found) {
        prioritized.push(found)
      }
    }
    // Add any remaining providers not in user priority
    for (const p of providers) {
      if (!prioritized.find((pp) => pp.name === p.name)) {
        prioritized.push(p)
      }
    }
    return prioritized
  }

  // Default: sort by priority number
  return [...providers].sort((a, b) => a.priority - b.priority)
}

/**
 * Get available providers — configured + Ollama if running.
 * Filters out unconfigured cloud providers silently.
 */
export async function getAvailableProviders(): Promise<ProviderConfig[]> {
  const sorted = getProvidersByPriority()
  const available: ProviderConfig[] = []

  for (const provider of sorted) {
    if (provider.isLocal) {
      // Ollama: check if running
      const ollama = await detectOllama()
      if (ollama.available) {
        available.push({
          ...provider,
          status: 'active',
          model: ollama.activeModel ?? provider.model,
        })
      }
    } else if (provider.status === 'active') {
      available.push(provider)
    }
    // unconfigured providers are skipped silently
  }

  return available
}
