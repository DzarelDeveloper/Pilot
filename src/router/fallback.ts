import type { ProviderConfig, ProviderRequest, ProviderResponse } from './providers/types.js'
import type { Message } from '../memory/types.js'
import { getProvidersByPriority } from './selector.js'
import { detectOllama } from './providers/ollama.js'
import { getProviderApiKey, getCloudflareAccountId } from '../config/index.js'
import { compressIfNeeded } from '../memory/compressor.js'
import { logger } from '../utils/logger.js'
import { getProviderPlugins } from '../plugins/manager.js'

export class PilotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PilotError'
  }
}

function isRateLimit(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('429') || error.message.includes('rate limit')
  }
  return false
}

interface OpenAIResponseChoice {
  message?: { content?: string }
}

interface OpenAIResponse {
  choices?: OpenAIResponseChoice[]
  usage?: { total_tokens?: number }
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> }
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

function buildOpenAIMessages(messages: Message[]): Array<{ role: string; content: string }> {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

function buildGeminiContents(messages: Message[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
}

function getSystemInstruction(messages: Message[]): string {
  const systemMsg = messages.find((m) => m.role === 'system')
  return systemMsg?.content ?? ''
}

async function sendToProvider(
  provider: ProviderConfig,
  request: ProviderRequest,
): Promise<ProviderResponse> {
  if (provider.format === 'google') {
    return sendToGemini(provider, request)
  }
  return sendToOpenAI(provider, request)
}

async function sendToGemini(
  provider: ProviderConfig,
  request: ProviderRequest,
): Promise<ProviderResponse> {
  const apiKey = getProviderApiKey(provider.name)
  if (!apiKey) {
    throw new Error(`API key not configured for ${provider.displayName}`)
  }

  const url = `${provider.baseUrl}/models/${provider.model}:generateContent?key=${apiKey}`

  const systemInstruction = getSystemInstruction(request.messages)
  const contents = buildGeminiContents(request.messages)

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: request.maxTokens ?? 8192,
      temperature: request.temperature ?? 0.7,
    },
  }

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    if (res.status === 429) {
      throw new Error(`429 Rate limit exceeded for ${provider.displayName}: ${errorText}`)
    }
    throw new Error(`${provider.displayName} error ${res.status}: ${errorText}`)
  }

  const data = (await res.json()) as GeminiResponse
  const content =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  return {
    content,
    provider: provider.name,
    model: provider.model,
    tokensUsed: Math.ceil(content.length / 4),
    isLocal: provider.isLocal,
  }
}

async function sendToOpenAI(
  provider: ProviderConfig,
  request: ProviderRequest,
): Promise<ProviderResponse> {
  let baseUrl = provider.baseUrl

  // Cloudflare needs account ID in URL
  if (provider.name === 'cloudflare') {
    const accountId = getCloudflareAccountId()
    if (!accountId) {
      throw new Error('Cloudflare account ID not configured')
    }
    baseUrl = baseUrl.replace('{account_id}', accountId)
  }

  const url = `${baseUrl}/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Ollama doesn't need auth
  if (!provider.isLocal) {
    const apiKey = getProviderApiKey(provider.name)
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.displayName}`)
    }
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  // Add custom headers (e.g., OpenRouter)
  if (provider.headers) {
    for (const [key, value] of Object.entries(provider.headers)) {
      headers[key] = value
    }
  }

  const body = {
    model: provider.model,
    messages: buildOpenAIMessages(request.messages),
    max_tokens: request.maxTokens ?? 4096,
    temperature: request.temperature ?? 0.7,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    if (res.status === 429) {
      throw new Error(`429 Rate limit exceeded for ${provider.displayName}: ${errorText}`)
    }
    throw new Error(`${provider.displayName} error ${res.status}: ${errorText}`)
  }

  const data = (await res.json()) as OpenAIResponse
  const content = data.choices?.[0]?.message?.content ?? ''
  const tokensUsed = data.usage?.total_tokens ?? Math.ceil(content.length / 4)

  return {
    content,
    provider: provider.name,
    model: provider.model,
    tokensUsed,
    isLocal: provider.isLocal,
  }
}

// Track provider switches for notifications
let lastSwitchInfo: { from: string; to: string } | null = null

export function getLastSwitch(): { from: string; to: string } | null {
  return lastSwitchInfo
}

export function clearLastSwitch(): void {
  lastSwitchInfo = null
}

/**
 * Send request with automatic fallback across providers.
 * Full history is always included — provider switch is seamless.
 */
export async function sendWithFallback(request: ProviderRequest): Promise<ProviderResponse> {
  const providers = getProvidersByPriority()
  let lastProvider = ''
  const errors: string[] = []

  for (const provider of providers) {
    // Skip unconfigured cloud providers
    if (!provider.isLocal && provider.status !== 'active') {
      continue
    }

    // Skip rate-limited cloud providers that haven't reset
    if (
      !provider.isLocal &&
      provider.status === 'rate-limited' &&
      provider.rateLimitResetAt &&
      provider.rateLimitResetAt > new Date()
    ) {
      continue
    }

    // Ollama: check if running (only if not a plugin)
    if (provider.isLocal && !provider.isPlugin) {
      const ollama = await detectOllama()
      if (!ollama.available) {
        continue
      }
      provider.model = ollama.activeModel ?? provider.model
    }

    try {
      const { messages, wasCompressed, savedTokens } = 
        await compressIfNeeded(request.messages, provider.contextWindow || 8192)
      
      if (wasCompressed) {
        logger.debug(`Token compression: saved ${savedTokens} tokens`)
      }

      let response: ProviderResponse
      if (provider.isPlugin) {
        const plugins = getProviderPlugins()
        const plugin = plugins.find(p => p.manifest.name === provider.name)
        if (!plugin || !plugin.module.complete) {
          throw new Error(`Plugin ${provider.name} is missing complete() function`)
        }
        const result = await plugin.module.complete({ ...request, messages })
        response = {
          content: result.content,
          provider: provider.name,
          model: 'plugin-model',
          tokensUsed: result.tokensUsed || Math.ceil(result.content.length / 4),
          isLocal: true
        }
      } else {
        response = await sendToProvider(provider, { ...request, messages })
      }

      // Track switch
      if (lastProvider && lastProvider !== provider.name) {
        lastSwitchInfo = { from: lastProvider, to: provider.name }
      }

      return response
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      errors.push(`${provider.displayName}: ${errorMsg}`)

      if (isRateLimit(error)) {
        provider.status = 'rate-limited'
        provider.rateLimitResetAt = new Date(Date.now() + 60 * 60 * 1000)
        lastProvider = provider.name
        continue
      }

      if (provider.isLocal) {
        // Ollama error, skip
        continue
      }

      // Other cloud error, try next
      lastProvider = provider.name
      continue
    }
  }

  if (errors.length === 0) {
    throw new PilotError(
      'Semua provider tidak tersedia.\n\n' +
      'Detail:\n  • Tidak ada satupun AI provider yang terkonfigurasi atau aktif saat ini.\n\n' +
      'Solusi:\n' +
      '  • Ketik `/setup` (lalu tekan Enter) untuk menambahkan API key baru.\n' +
      '  • Install dan jalankan Ollama (local) jika ingin menggunakan AI secara offline.'
    )
  }

  // Semua provider gagal setelah dicoba
  throw new PilotError(
    'Semua provider tidak tersedia.\n\n' +
      'Detail:\n' +
      errors.map((e) => `  • ${e}`).join('\n') +
      '\n\n' +
      'Solusi:\n' +
      '  • Periksa koneksi internet Anda.\n' +
      '  • Ketik `/setup` untuk memperbarui API keys yang invalid.\n' +
      '  • Pastikan Ollama sedang berjalan jika mengandalkan provider lokal.\n' +
      '  • Tunggu hingga limit gratis cloud provider Anda di-reset.\n',
  )
}
