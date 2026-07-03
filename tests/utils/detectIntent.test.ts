import { describe, it, expect } from 'vitest'
import { detectIntent } from '../../src/utils/detectIntent.js'

describe('detectIntent', () => {
  it('harus mendeteksi intent "code" untuk perintah pembuatan file', () => {
    expect(detectIntent('buat file auth.ts')).toBe('code')
  })

  it('harus mendeteksi intent "chat" untuk sapaan', () => {
    expect(detectIntent('halo apa kabar')).toBe('chat')
  })

  it('harus mendeteksi intent "chat" untuk pertanyaan umum', () => {
    expect(detectIntent('apa itu typescript?')).toBe('chat')
  })

  it('harus mendeteksi intent "code" untuk perintah edit', () => {
    expect(detectIntent('edit src/app.ts')).toBe('code')
  })

  it('harus mendeteksi intent "code" untuk perintah fix', () => {
    expect(detectIntent('fix error di login.ts')).toBe('code')
  })
})
