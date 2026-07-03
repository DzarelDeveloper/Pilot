import { describe, it, expect } from 'vitest'
import { truncate, formatDuration, formatBytes } from '../../src/utils/format.ts'
import { estimateTokens } from '../../src/utils/token-counter.ts'

describe('truncate', () => {
  it('should return text as-is if shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('should truncate and add ellipsis if text exceeds maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('should return text as-is if exactly maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('')
  })
})

describe('formatDuration', () => {
  it('should format milliseconds under 1 second', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(0)).toBe('0ms')
  })

  it('should format seconds', () => {
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(60000)).toBe('60.0s')
  })
})

describe('formatBytes', () => {
  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  it('should format kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB')
    expect(formatBytes(5242880)).toBe('5.0 MB')
  })
})

describe('estimateTokens', () => {
  it('should estimate tokens as ceil(length / 4)', () => {
    expect(estimateTokens('hello')).toBe(2) // 5/4 = 1.25 → 2
    expect(estimateTokens('abcd')).toBe(1)  // 4/4 = 1
    expect(estimateTokens('')).toBe(0)       // 0/4 = 0
    expect(estimateTokens('a')).toBe(1)      // 1/4 = 0.25 → 1
  })
})
