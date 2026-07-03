import type { Session, Message, FileRecord, ProjectMemory } from './types.js'
import {
  loadSession,
  createNewSession,
  appendMessageToSession,
  loadProjectMemory,
  recordFileAction as storeRecordFileAction,
  listAllSessions,
} from './store.js'
import {
  estimateMessagesTokens,
  buildSystemPrompt,
} from './compressor.js'

export function getSession(projectPath: string): Session | null {
  return loadSession(projectPath)
}

export function createSession(projectPath: string): Session {
  return createNewSession(projectPath)
}

export function getOrCreateSession(projectPath: string): Session {
  const existing = loadSession(projectPath)
  if (existing) return existing
  return createNewSession(projectPath)
}

export function appendMessage(session: Session, message: Message): Session {
  return appendMessageToSession(session, message)
}

export function getProject(projectPath: string): ProjectMemory | null {
  return loadProjectMemory(projectPath)
}

export function recordFileAction(
  projectPath: string,
  sessionId: string,
  record: FileRecord,
): void {
  storeRecordFileAction(projectPath, sessionId, record)
}

export function buildContext(
  projectPath: string,
  _contextWindow: number = 128_000,
): Message[] {
  const session = loadSession(projectPath)
  const project = loadProjectMemory(projectPath)

  const systemPrompt = buildSystemPrompt(
    projectPath,
    project?.techStack
      ? `${project.techStack.language}/${project.techStack.framework}`
      : undefined,
  )

  const systemMessage: Message = {
    role: 'system',
    content: systemPrompt,
    timestamp: new Date().toISOString(),
  }

  if (!session || session.messages.length === 0) {
    return [systemMessage]
  }

  const allMessages = [systemMessage, ...session.messages]

  return allMessages
}

export function estimateTokens(messages: Message[]): number {
  return estimateMessagesTokens(messages)
}

export function getAllSessions(): Session[] {
  return listAllSessions()
}

export type { Session, Message, FileRecord, ProjectMemory }
