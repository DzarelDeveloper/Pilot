export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  provider?: string
  model?: string
  tokensUsed?: number
}

export interface Session {
  id: string
  projectHash: string
  projectPath: string
  createdAt: string
  updatedAt: string
  messages: Message[]
  activeProvider: string
  switchCount: number
  filesCreated: string[]
  filesEdited: string[]
}

export interface TechStack {
  language: string
  framework: string
  packageManager: string
  testRunner?: string
}

export interface ProjectMemory {
  projectHash: string
  projectPath: string
  lastSeen: string
  techStack: TechStack
  filesCreated: FileRecord[]
  filesEdited: FileRecord[]
  conventions: ProjectConventions
}

export interface ProjectConventions {
  namingStyle: string
  importStyle: string
  semicolons: boolean
  quotes: 'single' | 'double'
}

export interface FileRecord {
  path: string
  action: 'created' | 'edited' | 'deleted'
  at: string
  sessionId: string
  description: string
}
