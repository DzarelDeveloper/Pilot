import type { PilotConfig } from './types.js'

export const defaultConfig: PilotConfig = {
  providers: {
    ollama: {
      enabled: true,
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
    },
  },
  providerPriority: [
    'gemini',
    'qwen',
    'nvidia-nim',
    'openrouter',
    'cloudflare',
    'kiro',
    'iflow',
    'opencode',
    'ollama',
  ],
  defaultMode: 'code',
}

export const PILOT_DIR_NAME = '.pilot'
export const CONFIG_FILE_NAME = 'config.json'
export const SESSIONS_DIR_NAME = 'sessions'
export const PROJECTS_DIR_NAME = 'projects'
export const LOGS_DIR_NAME = 'logs'
