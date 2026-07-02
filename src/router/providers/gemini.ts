import type { ProviderConfig } from './types.js'

export const geminiConfig: ProviderConfig = {
  name: 'gemini',
  displayName: 'Gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-2.0-flash',
  freeLimit: 1500,
  contextWindow: 1_000_000,
  envKey: 'GEMINI_API_KEY',
  format: 'google',
  isLocal: false,
  priority: 1,
  status: 'unconfigured',
}
