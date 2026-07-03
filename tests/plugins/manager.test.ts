import { describe, it, expect, vi } from 'vitest'

// Mock the logger (used by manager.ts)
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}))

describe('plugins/manager', () => {
  describe('getProviderPlugins', () => {
    it('should return empty array when no plugins loaded', async () => {
      const { getProviderPlugins } = await import('../../src/plugins/manager.ts')
      expect(getProviderPlugins()).toEqual([])
    })
  })

  describe('getCommandPlugins', () => {
    it('should return empty array when no plugins loaded', async () => {
      const { getCommandPlugins } = await import('../../src/plugins/manager.ts')
      expect(getCommandPlugins()).toEqual([])
    })
  })

  describe('getPluginsDir', () => {
    it('should return a path containing .pilot/plugins', async () => {
      const { getPluginsDir } = await import('../../src/plugins/manager.ts')
      const dir = getPluginsDir()
      expect(dir).toContain('.pilot')
      expect(dir).toContain('plugins')
    })
  })
})
