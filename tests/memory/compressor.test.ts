import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compressIfNeeded } from '../../src/memory/compressor.js'
import type { Message } from '../../src/memory/types.js'

// Mock fallback sendWithFallback for AI call
vi.mock('../../src/router/fallback.js', () => ({
  sendWithFallback: vi.fn().mockResolvedValue({ content: 'Mock summary', provider: 'mock', model: 'mock', tokensUsed: 10 })
}))

describe('compressIfNeeded', () => {
  const createContextMessages = (count: number, hasSystem = true): Message[] => {
    const msgs: Message[] = []
    if (hasSystem) {
      msgs.push({ role: 'system', content: 'You are an AI.', timestamp: new Date().toISOString() })
    }
    for (let i = 0; i < count; i++) {
      msgs.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Message ${i}`, timestamp: new Date().toISOString() })
    }
    return msgs
  }

  it('Messages pendek (< 75% window) -> tidak dicompress', async () => {
    const messages = createContextMessages(5)
    const contextWindow = 1000 // Huge context window for small messages
    
    const result = await compressIfNeeded(messages, contextWindow)
    
    expect(result.wasCompressed).toBe(false)
    expect(result.savedTokens).toBe(0)
    expect(result.messages.length).toBe(6) // 1 system + 5
  })

  it('Messages panjang (> 75% window) -> dicompress', async () => {
    // Generate lots of text so it exceeds 75% of context window (say contextWindow = 100)
    // 1 token = 4 chars roughly. 100 tokens = 400 chars. 75 tokens = 300 chars.
    const longMessages = createContextMessages(15)
    for (let i = 1; i < longMessages.length; i++) {
      longMessages[i]!.content = 'A'.repeat(50) // 50 chars ~ 12 tokens. 15 * 12 = 180 tokens
    }
    
    const contextWindow = 100
    
    const result = await compressIfNeeded(longMessages, contextWindow)
    
    expect(result.wasCompressed).toBe(true)
    expect(result.savedTokens).toBeGreaterThan(0)
  })

  it('Setelah compression, messages tetap punya system prompt', async () => {
    const longMessages = createContextMessages(20)
    for (let i = 1; i < longMessages.length; i++) {
      longMessages[i]!.content = 'B'.repeat(50)
    }
    
    const contextWindow = 100
    const result = await compressIfNeeded(longMessages, contextWindow)
    
    expect(result.messages[0]?.role).toBe('system')
    expect(result.messages[0]?.content).toBe('You are an AI.')
  })

  it('8 pesan terakhir selalu dipertahankan (Trim level 1)', async () => {
    const longMessages = createContextMessages(20) // 1 system, 20 msgs (0 to 19)
    for (let i = 1; i < longMessages.length; i++) {
      longMessages[i]!.content = `Message content ${i - 1} ${'C'.repeat(50)}`
    }
    
    const contextWindow = 200 // Ensure it hits Level 1 or Level 2 compression
    const result = await compressIfNeeded(longMessages, contextWindow)
    
    // Total messages = System + Summary/Trim + 8 recent
    const recentStart = result.messages.length - 8
    
    // Check if the last 8 messages match the original last 8
    for (let i = 0; i < 8; i++) {
      expect(result.messages[recentStart + i]?.content).toBe(longMessages[1 + 20 - 8 + i]?.content)
    }
  })
})
