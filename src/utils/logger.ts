import fs from 'node:fs'
import path from 'node:path'
import { getLogsDir } from '../config/index.js'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const isDebug = process.env['PILOT_DEBUG'] === '1'
const minLevel: LogLevel = isDebug ? 'debug' : 'info'

function getLogFilePath(): string {
  const logsDir = getLogsDir()
  return path.join(logsDir, 'pilot.log')
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function writeToLogFile(level: LogLevel, message: string): void {
  try {
    const logPath = getLogFilePath()
    const logLine = `[${formatTimestamp()}] [${level.toUpperCase()}] ${message}\n`
    fs.appendFileSync(logPath, logLine, 'utf-8')

    // Rotate: jika file > 5MB, hapus dan mulai baru
    const stats = fs.statSync(logPath)
    if (stats.size > 5 * 1024 * 1024) {
      fs.writeFileSync(logPath, logLine, 'utf-8')
    }
  } catch {
    // Jangan crash jika gagal nulis log
  }
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel]
}

export const logger = {
  debug(message: string): void {
    if (shouldLog('debug')) {
      writeToLogFile('debug', message)
    }
  },

  info(message: string): void {
    if (shouldLog('info')) {
      writeToLogFile('info', message)
    }
  },

  warn(message: string): void {
    if (shouldLog('warn')) {
      writeToLogFile('warn', message)
    }
  },

  error(message: string): void {
    writeToLogFile('error', message)
    // Error selalu tampil tapi format manusiawi (bukan stack trace)
  },
}
