import type { ProviderConfig, OllamaStatus, OllamaTagsResponse } from './types.js'

export const RECOMMENDED_MODELS = [
  { name: 'llama3.2',      size: '2GB',   desc: 'Recommended · General purpose' },
  { name: 'qwen2.5-coder', size: '4.7GB', desc: 'Best for coding'               },
  { name: 'phi3',          size: '2.3GB', desc: 'Ringan & cepat'                },
  { name: 'deepseek-r1',   size: '4.7GB', desc: 'Terbaik untuk reasoning'       },
  { name: 'mistral',       size: '4.1GB', desc: 'Balanced, fast'                },
]

export const ollamaConfig: ProviderConfig = {
  name: 'ollama',
  displayName: 'Ollama',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3.2',
  freeLimit: Infinity,
  contextWindow: 8_192,
  envKey: null,
  format: 'openai',
  isLocal: true,
  autoDetect: true,
  installUrl: 'https://ollama.com/download',
  recommendedModels: RECOMMENDED_MODELS.map(m => m.name),
  priority: 9,
  status: 'unconfigured',
}

/**
 * Auto-detect Ollama di localhost:11434.
 * Timeout 1 detik, non-blocking, JANGAN throw error.
 */
export async function detectOllama(): Promise<OllamaStatus> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1000)

    const res = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      return { available: false }
    }

    const data = (await res.json()) as OllamaTagsResponse
    const models = data.models?.map((m) => m.name) ?? []

    return {
      available: true,
      models,
      activeModel: pickBestModel(models, ollamaConfig.recommendedModels ?? []),
    }
  } catch {
    return { available: false }
  }
}

/**
 * Pilih model terbaik dari yang sudah di-pull.
 * Prioritas: recommended models dulu, fallback ke model apapun.
 */
export function pickBestModel(installed: string[], recommended: string[]): string {
  for (const rec of recommended) {
    const found = installed.find((m) => m.startsWith(rec))
    if (found) return found
  }
  // Fallback ke model pertama yang ada
  if (installed.length > 0) {
    return installed[0] ?? 'llama3.2'
  }
  return 'llama3.2'
}
