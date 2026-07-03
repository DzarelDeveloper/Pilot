import { describe, it, expect, vi } from 'vitest'
import { getResolvedProviders } from '../../src/router/providers/index.ts'

// Mock config to avoid filesystem access
vi.mock('../../src/config/index.js', () => ({
  isProviderConfigured: vi.fn().mockReturnValue(false),
  getConfig: vi.fn().mockReturnValue({
    providers: { ollama: { enabled: true, model: 'llama3.2', baseUrl: 'http://localhost:11434' } },
    providerPriority: [],
    defaultMode: 'code',
  }),
  getPilotDir: vi.fn().mockReturnValue('/tmp/test-pilot'),
  getSessionsDir: vi.fn().mockReturnValue('/tmp/test-pilot/sessions'),
  getProjectsDir: vi.fn().mockReturnValue('/tmp/test-pilot/projects'),
  getLogsDir: vi.fn().mockReturnValue('/tmp/test-pilot/logs'),
}))

vi.mock('../../src/plugins/manager.js', () => ({
  getProviderPlugins: vi.fn().mockReturnValue([]),
}))

vi.mock('../../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

describe('router/providers', () => {
  describe('getResolvedProviders', () => {
    it('should return an array of providers', () => {
      const providers = getResolvedProviders()
      expect(Array.isArray(providers)).toBe(true)
      expect(providers.length).toBeGreaterThan(0)
    })

    it('should include required fields in each provider', () => {
      const providers = getResolvedProviders()
      for (const p of providers) {
        expect(p).toHaveProperty('name')
        expect(p).toHaveProperty('status')
        expect(p).toHaveProperty('model')
        expect(p).toHaveProperty('format')
      }
    })

    it('all built-in providers should be unconfigured when no keys are set', () => {
      const providers = getResolvedProviders()
      const builtIns = providers.filter(p => !p.isPlugin)
      for (const p of builtIns) {
        expect(p.status).toBe('unconfigured')
      }
    })
  })
})
