import type { Message } from './types.js'

/**
 * Estimasi token berdasarkan jumlah karakter.
 * Rule of thumb: 1 token ≈ 4 karakter.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function estimateMessagesTokens(messages: Message[]): number {
  let total = 0
  for (const msg of messages) {
    total += estimateTokens(msg.content)
    // Overhead per message (role, metadata)
    total += 10
  }
  return total
}

export const COMPRESSION_THRESHOLD = 0.75

export async function compressIfNeeded(
  messages: Message[],
  contextWindow: number
): Promise<{ messages: Message[], wasCompressed: boolean, savedTokens: number }> {
  const maxTokens = Math.floor(contextWindow * COMPRESSION_THRESHOLD)
  const initialTokens = estimateMessagesTokens(messages)

  if (initialTokens < maxTokens) {
    return { messages, wasCompressed: false, savedTokens: 0 }
  }

  // Level 1: Trim (tanpa AI call)
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  const recentCount = Math.min(8, nonSystemMessages.length)
  const recentMessages = nonSystemMessages.slice(-recentCount)
  const oldMessages = nonSystemMessages.slice(0, -recentCount)

  if (oldMessages.length === 0) {
    return { messages, wasCompressed: false, savedTokens: 0 }
  }

  const level1Messages = [...systemMessages, ...recentMessages]
  const level1Tokens = estimateMessagesTokens(level1Messages)

  if (level1Tokens < maxTokens) {
    return { 
      messages: level1Messages, 
      wasCompressed: true, 
      savedTokens: initialTokens - level1Tokens 
    }
  }

  // Level 2: Summarize (pakai AI call)
  const { sendWithFallback } = await import('../router/fallback.js')
  
  const textToSummarize = oldMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 500)}`).join('\n\n')
  
  const summarizePrompt = `Summarize percakapan berikut menjadi 3-5 kalimat singkat.
Wajib pertahankan: nama file, nama function, keputusan teknis.
Format: paragraph singkat, bukan bullet points.

Percakapan:
${textToSummarize}`

  try {
    const response = await sendWithFallback({
      messages: [{ role: 'user', content: summarizePrompt, timestamp: new Date().toISOString() }],
      temperature: 0.3
    })
    
    const summaryMessage: Message = {
      role: 'assistant',
      content: `[Context sebelumnya: ${response.content}]`,
      timestamp: new Date().toISOString()
    }
    
    const level2Messages = [...systemMessages, summaryMessage, ...recentMessages]
    const level2Tokens = estimateMessagesTokens(level2Messages)
    
    return {
      messages: level2Messages,
      wasCompressed: true,
      savedTokens: initialTokens - level2Tokens
    }
  } catch (err) {
    return {
      messages: level1Messages,
      wasCompressed: true,
      savedTokens: initialTokens - level1Tokens
    }
  }
}

/**
 * Build system prompt berdasarkan project context.
 */
export function buildSystemPrompt(projectPath: string, techStack?: string): string {
  const parts = [
    'Kamu adalah Pilot, AI coding assistant yang membantu developer.',
    'Kamu membantu dengan coding, debugging, dan menjawab pertanyaan teknis.',
    '',
    `Project path: ${projectPath}`,
  ]

  if (techStack) {
    parts.push(`Tech stack: ${techStack}`)
  }

  parts.push(
    '',
    'Jawab dalam bahasa yang sama dengan bahasa user (Indonesia/English).',
    'Untuk coding tasks, berikan kode yang production-ready dengan error handling.',
  )

  return parts.join('\n')
}
