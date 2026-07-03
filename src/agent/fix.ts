import fs from 'node:fs'
import path from 'node:path'
import { learnFromProject } from '../memory/projectMemory.js'
import { sendWithFallback } from '../router/fallback.js'
import type { Session, Message } from '../memory/types.js'
import type { PlanResult } from './types.js'

export function extractFileFromError(errorMsg: string, projectPath: string): string | null {
  // Regex 1: "at functionName (filepath:line:col)"
  const stackRegex = /at\s+.*?\s+\((.*?):(\d+):(\d+)\)/
  const stackMatch = errorMsg.match(stackRegex)
  if (stackMatch && stackMatch[1]) {
    return resolveFilePath(stackMatch[1], projectPath)
  }

  // Regex 2: "Error in filepath:line"
  const errorInRegex = /Error in\s+(.*?):(\d+)/
  const errorInMatch = errorMsg.match(errorInRegex)
  if (errorInMatch && errorInMatch[1]) {
    return resolveFilePath(errorInMatch[1], projectPath)
  }
  
  // Regex 3: Filepath string directly in the error
  const filepathRegex = /([a-zA-Z0-9_\-./\\]+\.(?:ts|tsx|js|jsx|py|go|rs|cpp|c|h|java|cs))/
  const fpMatch = errorMsg.match(filepathRegex)
  if (fpMatch && fpMatch[1]) {
    return resolveFilePath(fpMatch[1], projectPath)
  }

  return null
}

export function resolveFilePath(filePath: string, projectPath: string): string | null {
  const absPath = path.resolve(projectPath, filePath)
  if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
    return absPath
  }

  const srcPath = path.join(projectPath, 'src', filePath)
  if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
    return srcPath
  }

  return findFileRecursively(projectPath, path.basename(filePath))
}

function findFileRecursively(dir: string, filename: string): string | null {
  if (!fs.existsSync(dir)) return null
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.pilot', '.next']
  const files = fs.readdirSync(dir)
  for (const file of files) {
    if (ignoreDirs.includes(file)) continue
    
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findFileRecursively(fullPath, filename)
      if (found) return found
    } else if (file === filename) {
      return fullPath
    }
  }
  return null
}

export async function analyzeBug(
  errorMsg: string,
  filePath: string,
  projectPath: string,
  _session: Session
): Promise<PlanResult> {
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const knowledge = await learnFromProject(projectPath)

  const systemPrompt = `Kamu adalah senior developer yang mem-fix bug.
    
Konteks project: ${JSON.stringify(knowledge)}

Analisis error berikut dan berikan rencana perbaikan yang konkret.
Ikuti instruksi secara ketat.

Output HARUS berupa format JSON murni tanpa markdown \`\`\`json.
Format output persis seperti tipe \`PlanResult\` ini:
{
  "summary": "Analisis singkat (Root cause, masalah di mana, dan fix yang tepat)",
  "steps": [
    {
      "id": 1,
      "action": "edit",
      "file": "path/relatif/dari/root",
      "reason": "Penjelasan perubahan",
      "estimatedLines": 5
    }
  ],
  "dependencies": [],
  "warnings": []
}

Hanya gunakan action "edit" untuk memodifikasi file terkait.`

  const userMessage = `Error yang dilaporkan:
${errorMsg}

Isi file ${filePath}:
${fileContent}`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
  ]

  const response = await sendWithFallback({ messages })
  
  let text = response.content.trim()
  if (text.startsWith('```json')) text = text.slice(7)
  else if (text.startsWith('```')) text = text.slice(3)
  if (text.endsWith('```')) text = text.slice(0, -3)
  text = text.trim()

  return JSON.parse(text) as PlanResult
}
