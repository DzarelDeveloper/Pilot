import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getSessionsDir, getProjectsDir } from '../config/index.js'
import type { Session, ProjectMemory, Message, FileRecord } from './types.js'

export function computeProjectHash(projectPath: string): string {
  return crypto.createHash('md5').update(projectPath).digest('hex').slice(0, 8)
}

function getSessionFilePath(projectHash: string): string {
  const date = new Date().toISOString().split('T')[0]
  return path.join(getSessionsDir(), `${projectHash}-${date}.json`)
}

function getProjectFilePath(projectHash: string): string {
  return path.join(getProjectsDir(), `${projectHash}.json`)
}

export function loadSession(projectPath: string): Session | null {
  const hash = computeProjectHash(projectPath)
  const filePath = getSessionFilePath(hash)

  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  const filePath = getSessionFilePath(session.projectHash)
  session.updatedAt = new Date().toISOString()
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8')
}

export function createNewSession(projectPath: string): Session {
  const hash = computeProjectHash(projectPath)
  const now = new Date().toISOString()

  const session: Session = {
    id: crypto.randomUUID(),
    projectHash: hash,
    projectPath,
    createdAt: now,
    updatedAt: now,
    messages: [],
    activeProvider: '',
    switchCount: 0,
    filesCreated: [],
    filesEdited: [],
  }

  saveSession(session)
  return session
}

export function appendMessageToSession(session: Session, message: Message): Session {
  session.messages.push(message)
  session.updatedAt = new Date().toISOString()
  saveSession(session)
  return session
}

export function loadProjectMemory(projectPath: string): ProjectMemory | null {
  const hash = computeProjectHash(projectPath)
  const filePath = getProjectFilePath(hash)

  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data) as ProjectMemory
  } catch {
    return null
  }
}

export function saveProjectMemory(memory: ProjectMemory): void {
  const filePath = getProjectFilePath(memory.projectHash)
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), 'utf-8')
}

export function recordFileAction(
  projectPath: string,
  _sessionId: string,
  record: FileRecord,
): void {
  const hash = computeProjectHash(projectPath)
  let memory = loadProjectMemory(projectPath)

  if (!memory) {
    memory = {
      projectHash: hash,
      projectPath,
      lastSeen: new Date().toISOString(),
      techStack: {
        language: 'unknown',
        framework: 'unknown',
        packageManager: 'unknown',
      },
      filesCreated: [],
      filesEdited: [],
      conventions: {
        namingStyle: 'camelCase',
        importStyle: 'import',
        semicolons: true,
        quotes: 'single',
      },
    }
  }

  memory.lastSeen = new Date().toISOString()

  if (record.action === 'created') {
    memory.filesCreated.push(record)
  } else if (record.action === 'edited' || record.action === 'deleted') {
    memory.filesEdited.push(record)
  }

  saveProjectMemory(memory)
}

export function listAllSessions(): Session[] {
  const sessionsDir = getSessionsDir()

  if (!fs.existsSync(sessionsDir)) {
    return []
  }

  const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.json'))
  const sessions: Session[] = []

  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(sessionsDir, file), 'utf-8')
      sessions.push(JSON.parse(data) as Session)
    } catch {
      // Skip corrupted session files
    }
  }

  return sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}
