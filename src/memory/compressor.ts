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

/**
 * Kompres history jika terlalu panjang.
 *
 * Strategy:
 * 1. Pertahankan system prompt (pesan pertama jika role=system)
 * 2. Pertahankan 5 pesan terakhir (selalu full)
 * 3. Summarize pesan lama jadi 1 blok
 */
export function compressHistory(
  messages: Message[],
  contextWindow: number,
): Message[] {
  const maxTokens = Math.floor(contextWindow * 0.8)
  const currentTokens = estimateMessagesTokens(messages)

  // Belum perlu compress
  if (currentTokens <= maxTokens) {
    return messages
  }

  // Pisahkan system prompt
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  // Pertahankan 5 pesan terakhir
  const recentCount = Math.min(5, nonSystemMessages.length)
  const recentMessages = nonSystemMessages.slice(-recentCount)
  const oldMessages = nonSystemMessages.slice(0, -recentCount)

  if (oldMessages.length === 0) {
    return messages
  }

  // Summarize pesan lama
  const summaryParts: string[] = []
  for (const msg of oldMessages) {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant'
    const truncated =
      msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content
    summaryParts.push(`[${roleLabel}]: ${truncated}`)
  }

  const summaryMessage: Message = {
    role: 'system',
    content: `[COMPRESSED HISTORY - ${oldMessages.length} pesan sebelumnya]\n${summaryParts.join('\n')}`,
    timestamp: new Date().toISOString(),
  }

  return [...systemMessages, summaryMessage, ...recentMessages]
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
