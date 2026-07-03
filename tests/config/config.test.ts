import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// We need to test config functions, but they interact with the filesystem.
// We'll mock fs to control the test environment.

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      statSync: vi.fn().mockReturnValue({ size: 100 }),
      appendFileSync: vi.fn(),
    },
  }
})

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isProviderConfigured', () => {
    it('should return false for unknown provider name', async () => {
      // Reset config cache before testing
      const { resetConfigCache, isProviderConfigured } = await import('../../src/config/index.ts')
      
      // Simulate no config file
      vi.mocked(fs.existsSync).mockReturnValue(false)
      resetConfigCache()
      
      expect(isProviderConfigured('nonexistent-provider')).toBe(false)
    })

    it('should return true for ollama with default config', async () => {
      const { resetConfigCache, isProviderConfigured } = await import('../../src/config/index.ts')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      resetConfigCache()
      
      // Default config has ollama.enabled = true
      expect(isProviderConfigured('ollama')).toBe(true)
    })
  })

  describe('getProviderApiKey', () => {
    it('should return null for unknown provider', async () => {
      const { resetConfigCache, getProviderApiKey } = await import('../../src/config/index.ts')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      resetConfigCache()
      
      expect(getProviderApiKey('unknown')).toBeNull()
    })
  })

  describe('getCloudflareAccountId', () => {
    it('should return null when cloudflare not configured', async () => {
      const { resetConfigCache, getCloudflareAccountId } = await import('../../src/config/index.ts')
      vi.mocked(fs.existsSync).mockReturnValue(false)
      resetConfigCache()
      
      expect(getCloudflareAccountId()).toBeNull()
    })
  })

  describe('defaults', () => {
    it('should export correct default values', async () => {
      const { defaultConfig, PILOT_DIR_NAME, CONFIG_FILE_NAME } = await import('../../src/config/defaults.ts')
      expect(defaultConfig).toBeDefined()
      expect(defaultConfig.providers.ollama?.enabled).toBe(true)
      expect(defaultConfig.providerPriority).toContain('gemini')
      expect(defaultConfig.providerPriority).toContain('ollama')
      expect(PILOT_DIR_NAME).toBe('.pilot')
      expect(CONFIG_FILE_NAME).toBe('config.json')
    })
  })
})
