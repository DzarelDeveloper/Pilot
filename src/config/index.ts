import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { PilotConfig, ProvidersConfig } from './types.js'
import {
  defaultConfig,
  PILOT_DIR_NAME,
  CONFIG_FILE_NAME,
  SESSIONS_DIR_NAME,
  PROJECTS_DIR_NAME,
  LOGS_DIR_NAME,
} from './defaults.js'

const PILOT_DIR = path.join(os.homedir(), PILOT_DIR_NAME)
const CONFIG_FILE = path.join(PILOT_DIR, CONFIG_FILE_NAME)

// In-memory cache — config dibaca sekali, lalu di-cache
let cachedConfig: PilotConfig | null = null

function ensurePilotDir(): void {
  const dirs = [
    PILOT_DIR,
    path.join(PILOT_DIR, SESSIONS_DIR_NAME),
    path.join(PILOT_DIR, PROJECTS_DIR_NAME),
    path.join(PILOT_DIR, LOGS_DIR_NAME),
  ]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

function deepMerge(target: PilotConfig, source: Partial<PilotConfig>): PilotConfig {
  const result: PilotConfig = { ...target }

  if (source.providers) {
    result.providers = { ...target.providers, ...source.providers }
  }

  if (source.providerPriority) {
    result.providerPriority = source.providerPriority
  }

  if (source.defaultMode) {
    result.defaultMode = source.defaultMode
  }

  return result
}

export function getPilotDir(): string {
  ensurePilotDir()
  return PILOT_DIR
}

export function getSessionsDir(): string {
  return path.join(getPilotDir(), SESSIONS_DIR_NAME)
}

export function getProjectsDir(): string {
  return path.join(getPilotDir(), PROJECTS_DIR_NAME)
}

export function getLogsDir(): string {
  return path.join(getPilotDir(), LOGS_DIR_NAME)
}

export function getConfig(): PilotConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  ensurePilotDir()

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const userConfig = JSON.parse(data) as Partial<PilotConfig>
      cachedConfig = deepMerge(defaultConfig, userConfig)
    } catch {
      cachedConfig = { ...defaultConfig }
    }
  } else {
    cachedConfig = { ...defaultConfig }
  }

  return cachedConfig
}

export function saveConfig(config: PilotConfig): void {
  ensurePilotDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  // Invalidate cache sehingga next getConfig() baca yang baru
  cachedConfig = config
}

export function resetConfigCache(): void {
  cachedConfig = null
}

export function isProviderConfigured(name: string): boolean {
  const config = getConfig()
  const providers = config.providers

  switch (name) {
    case 'gemini':
      return !!providers.gemini?.apiKey
    case 'qwen':
      return !!providers.qwen?.apiKey
    case 'nvidia-nim':
      return !!providers.nvidiaNim?.apiKey
    case 'openrouter':
      return !!providers.openrouter?.apiKey
    case 'cloudflare':
      return !!providers.cloudflare?.apiKey && !!providers.cloudflare?.accountId
    case 'kiro':
      return !!providers.kiro?.apiKey
    case 'iflow':
      return !!providers.iflow?.apiKey
    case 'opencode':
      return !!providers.opencode?.apiKey
    case 'ollama':
      return providers.ollama?.enabled !== false
    default:
      return false
  }
}

export function getProviderApiKey(name: string): string | null {
  const config = getConfig()
  const providers = config.providers

  const keyMap: Record<string, string | undefined> = {
    gemini: providers.gemini?.apiKey,
    qwen: providers.qwen?.apiKey,
    'nvidia-nim': providers.nvidiaNim?.apiKey,
    openrouter: providers.openrouter?.apiKey,
    cloudflare: providers.cloudflare?.apiKey,
    kiro: providers.kiro?.apiKey,
    iflow: providers.iflow?.apiKey,
    opencode: providers.opencode?.apiKey,
  }

  return keyMap[name] ?? null
}

export function getCloudflareAccountId(): string | null {
  const config = getConfig()
  return config.providers.cloudflare?.accountId ?? null
}

export type { PilotConfig, ProvidersConfig }
