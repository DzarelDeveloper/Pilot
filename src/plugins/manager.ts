import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { logger } from '../utils/logger.js'

export interface PluginManifest {
  name: string
  version: string
  entry: string
  type: 'provider' | 'command'
  commandName?: string
}

export interface PluginInstance {
  manifest: PluginManifest
  module: any
  dirPath: string
}

let loadedPlugins: PluginInstance[] | null = null

export function getPluginsDir(): string {
  const dir = path.join(os.homedir(), '.pilot', 'plugins')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export async function loadPlugins(): Promise<PluginInstance[]> {
  if (loadedPlugins) return loadedPlugins

  const pluginsDir = getPluginsDir()
  const pluginFolders = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  const plugins: PluginInstance[] = []

  for (const folder of pluginFolders) {
    const dirPath = path.join(pluginsDir, folder)
    const manifestPath = path.join(dirPath, 'plugin.json')

    if (!fs.existsSync(manifestPath)) {
      logger.warn(`Plugin folder ${folder} missing plugin.json. Skipping.`)
      continue
    }

    try {
      const manifestStr = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestStr) as PluginManifest

      // Minimal validation
      if (!manifest.name || !manifest.entry || !manifest.type) {
        logger.warn(`Plugin ${folder} has invalid manifest schema. Skipping.`)
        continue
      }
      if (manifest.type === 'command' && !manifest.commandName) {
        logger.warn(`Plugin ${folder} is type command but missing commandName. Skipping.`)
        continue
      }

      const entryPath = path.join(dirPath, manifest.entry)
      if (!fs.existsSync(entryPath)) {
        logger.warn(`Plugin ${manifest.name} missing entry file ${manifest.entry}. Skipping.`)
        continue
      }

      // Convert to file URL for dynamic import on Windows/Linux
      const fileUrl = 'file://' + entryPath
      const module = await import(fileUrl)

      plugins.push({ manifest, module, dirPath })
    } catch (err) {
      logger.warn(`Failed to load plugin ${folder}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  loadedPlugins = plugins
  return plugins
}

export function getProviderPlugins(): PluginInstance[] {
  return (loadedPlugins || []).filter(p => p.manifest.type === 'provider')
}

export function getCommandPlugins(): PluginInstance[] {
  return (loadedPlugins || []).filter(p => p.manifest.type === 'command')
}
