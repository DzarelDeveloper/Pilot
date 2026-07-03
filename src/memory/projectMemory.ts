import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

export interface ProjectKnowledge {
  projectHash: string
  projectPath: string
  lastUpdated: string
  techStack: {
    language: string
    framework: string
    packageManager: string
    testRunner?: string
    styling?: string
    database?: string
  }
  conventions: {
    namingFiles: string
    namingFunctions: string
    importStyle: string
    semicolons: boolean
    quotes: 'single' | 'double'
    indentation: 2 | 4
  }
  filesCreatedByPilot: {
    path: string
    description: string
    createdAt: string
  }[]
  filesEditedByPilot: {
    path: string
    description: string
    editedAt: string
  }[]
  notes: string[]
}

const getProjectsDir = (): string => {
  const dir = path.join(os.homedir(), '.pilot', 'projects')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

const getProjectHash = (projectPath: string): string => {
  return crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 8)
}

const getKnowledgePath = (projectPath: string): string => {
  return path.join(getProjectsDir(), `${getProjectHash(projectPath)}.json`)
}

export async function loadProjectKnowledge(projectPath: string): Promise<ProjectKnowledge | null> {
  const filepath = getKnowledgePath(projectPath)
  if (!fs.existsSync(filepath)) return null
  try {
    const data = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(data) as ProjectKnowledge
  } catch {
    return null
  }
}

export async function saveProjectKnowledge(knowledge: ProjectKnowledge): Promise<void> {
  const filepath = getKnowledgePath(knowledge.projectPath)
  fs.writeFileSync(filepath, JSON.stringify(knowledge, null, 2))
}

export async function learnFromProject(projectPath: string): Promise<ProjectKnowledge> {
  const existing = await loadProjectKnowledge(projectPath)
  if (existing) {
    const lastUpdated = new Date(existing.lastUpdated).getTime()
    const now = Date.now()
    if (now - lastUpdated < 24 * 60 * 60 * 1000) {
      return existing
    }
  }

  // Scan project
  const knowledge: ProjectKnowledge = existing || {
    projectHash: getProjectHash(projectPath),
    projectPath,
    lastUpdated: new Date().toISOString(),
    techStack: {
      language: 'javascript',
      framework: 'none',
      packageManager: 'npm'
    },
    conventions: {
      namingFiles: 'kebab-case',
      namingFunctions: 'camelCase',
      importStyle: 'require',
      semicolons: true,
      quotes: 'single',
      indentation: 2
    },
    filesCreatedByPilot: [],
    filesEditedByPilot: [],
    notes: []
  }

  knowledge.lastUpdated = new Date().toISOString()

  // Read package.json
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) knowledge.techStack.packageManager = 'pnpm'
      else if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) knowledge.techStack.packageManager = 'yarn'
      
      const deps = { ...pkg?.dependencies, ...pkg?.devDependencies }
      if (deps['typescript']) knowledge.techStack.language = 'typescript'
      
      if (deps['next']) knowledge.techStack.framework = 'nextjs'
      else if (deps['express']) knowledge.techStack.framework = 'express'
      else if (deps['fastapi']) knowledge.techStack.framework = 'fastapi'
      else if (deps['react']) knowledge.techStack.framework = 'react'
      
      if (deps['vitest']) knowledge.techStack.testRunner = 'vitest'
      else if (deps['jest']) knowledge.techStack.testRunner = 'jest'

      if (deps['tailwindcss']) knowledge.techStack.styling = 'tailwindcss'
    } catch { /* ignore */ }
  } else if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
    knowledge.techStack.language = 'python'
    knowledge.techStack.packageManager = 'pip'
  }

  // Read tsconfig.json
  if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
    knowledge.techStack.language = 'typescript'
  }

  // Scan 3-5 files in src/
  const srcPath = path.join(projectPath, 'src')
  if (fs.existsSync(srcPath)) {
    try {
      const files = fs.readdirSync(srcPath).filter(f => fs.statSync(path.join(srcPath, f)).isFile() && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx'))).slice(0, 5)
      
      let importCount = 0
      let requireCount = 0
      let semiCount = 0
      let noSemiCount = 0
      let singleQuoteCount = 0
      let doubleQuoteCount = 0

      for (const file of files) {
        const content = fs.readFileSync(path.join(srcPath, file), 'utf-8')
        if (content.includes('import ')) importCount++
        if (content.includes('require(')) requireCount++
        
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        let localSemi = 0
        let localNoSemi = 0
        for (const line of lines) {
           if (line.endsWith(';')) localSemi++
           else if (line.match(/[a-zA-Z0-9)\]}]$/)) localNoSemi++
        }
        if (localSemi > localNoSemi) semiCount++
        else noSemiCount++

        const singles = (content.match(/'/g) || []).length
        const doubles = (content.match(/"/g) || []).length
        if (singles > doubles) singleQuoteCount++
        else doubleQuoteCount++
      }

      if (importCount > requireCount) knowledge.conventions.importStyle = 'import'
      else knowledge.conventions.importStyle = 'require'

      if (semiCount > noSemiCount) knowledge.conventions.semicolons = true
      else knowledge.conventions.semicolons = false

      if (singleQuoteCount > doubleQuoteCount) knowledge.conventions.quotes = 'single'
      else knowledge.conventions.quotes = 'double'
      
    } catch { /* ignore */ }
  }

  await saveProjectKnowledge(knowledge)
  return knowledge
}

export async function updateAfterExecute(
  projectPath: string,
  filesCreated: { path: string, description: string }[],
  filesEdited: { path: string, description: string }[]
): Promise<void> {
  const knowledge = await loadProjectKnowledge(projectPath)
  if (!knowledge) return

  const now = new Date().toISOString()
  
  filesCreated.forEach(f => {
    knowledge.filesCreatedByPilot.push({ ...f, createdAt: now })
  })

  filesEdited.forEach(f => {
    knowledge.filesEditedByPilot.push({ ...f, editedAt: now })
  })

  await saveProjectKnowledge(knowledge)
}
