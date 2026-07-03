import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Mock dependencies
vi.mock('../../src/router/fallback.js', () => ({
  sendWithFallback: vi.fn().mockResolvedValue({
    content: 'Mock response',
    provider: 'mock',
    model: 'mock-model'
  })
}))

vi.mock('../../src/plugins/manager.js', () => ({
  getPluginsDir: vi.fn().mockReturnValue('/mock/plugins'),
  loadPlugins: vi.fn().mockResolvedValue([]),
  getProviderPlugins: vi.fn().mockReturnValue([])
}))

describe('CLI Commands', () => {
  beforeEach(() => {
    // Suppress console output for tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('explain command', () => {
    it('should show error if no file provided', async () => {
      const { runExplain } = await import('../../src/cli/commands/explain.ts')
      await runExplain([])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Silakan berikan path file'))
    })

    it('should show error if first arg is a flag', async () => {
      const { runExplain } = await import('../../src/cli/commands/explain.ts')
      await runExplain(['--deep'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Silakan berikan path file'))
    })

    it('should show error if file does not exist', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      const { runExplain } = await import('../../src/cli/commands/explain.ts')
      await runExplain(['missing.js'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('File tidak ditemukan'))
    })

    it('should show error if path is a directory', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true } as any)
      const { runExplain } = await import('../../src/cli/commands/explain.ts')
      await runExplain(['src/'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('direktori'))
    })
  })

  describe('fix command', () => {
    it('should show error if no error message provided', async () => {
      const { runFix } = await import('../../src/cli/commands/fix.ts')
      await runFix([])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Silakan berikan pesan error'))
    })

    it('should show error if only flags are provided (no actual error message)', async () => {
      const { runFix } = await import('../../src/cli/commands/fix.ts')
      await runFix(['--apply'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Pesan error tidak boleh kosong'))
    })
  })

  describe('plugin command', () => {
    it('should show help if no subcommand provided', async () => {
      const { runPlugin } = await import('../../src/cli/commands/plugin.ts')
      await runPlugin([])
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Pilot Plugin System'))
    })

    it('should call handleList on "list"', async () => {
      const { runPlugin } = await import('../../src/cli/commands/plugin.ts')
      await runPlugin(['list'])
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Plugin Terpasang'))
    })

    it('should show error for unknown subcommand', async () => {
      const { runPlugin } = await import('../../src/cli/commands/plugin.ts')
      await runPlugin(['unknown-cmd'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Subcommand tidak dikenal'))
    })

    it('should show error for add without path', async () => {
      const { runPlugin } = await import('../../src/cli/commands/plugin.ts')
      await runPlugin(['add'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Silakan berikan path'))
    })

    it('should show error for remove without name', async () => {
      const { runPlugin } = await import('../../src/cli/commands/plugin.ts')
      await runPlugin(['remove'])
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Silakan berikan nama'))
    })
  })
})
