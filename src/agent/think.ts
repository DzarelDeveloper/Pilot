import fs from 'node:fs'
import path from 'node:path'
import { sendWithFallback } from '../router/fallback.js'
import { buildContext } from '../memory/index.js'
import { scanProject } from '../tools/scanProject.js'
import { learnFromProject } from '../memory/projectMemory.js'
import type { Session, Message } from '../memory/types.js'
import type { ThinkResult } from './types.js'

export async function thinkPhase(
  session: Session,
  userRequest: string,
): Promise<ThinkResult> {
  const projectPath = session.projectPath

  // 1. Baca package.json
  let packageJsonStr = ''
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      packageJsonStr = fs.readFileSync(pkgPath, 'utf-8')
    } catch {
      // ignore
    }
  }

  // 2. Scan src/ directory (max depth 2)
  let srcStructure = ''
  const srcPath = path.join(projectPath, 'src')
  if (fs.existsSync(srcPath)) {
    const tree = await scanProject(srcPath, 2)
    srcStructure = JSON.stringify(tree, null, 2)
  }

  // 3. File yang sudah pernah dibuat Pilot
  const filesCreated = session.filesCreated.join(', ')

  // 4. Project Knowledge
  const projectKnowledge = await learnFromProject(projectPath)
  const filesCreatedByPilotStr = projectKnowledge.filesCreatedByPilot.map(f => f.path + ' — ' + f.description).join('\n')
  const filesEditedByPilotStr = projectKnowledge.filesEditedByPilot.map(f => f.path).join('\n')

  const systemPrompt = `
Kamu adalah Pilot, AI coding agent. 
Tugasmu sekarang: PAHAMI request user dan konteks project. Jangan buat kode dulu.

Konteks project yang sudah diketahui:
Tech Stack: ${projectKnowledge.techStack.framework} · ${projectKnowledge.techStack.language} · ${projectKnowledge.techStack.packageManager}
Conventions: ${projectKnowledge.conventions.namingFiles} files, ${projectKnowledge.conventions.importStyle} imports, ${projectKnowledge.conventions.semicolons ? 'semicolons' : 'no semicolons'}

File yang sudah pernah Pilot buat:
${filesCreatedByPilotStr || 'Belum ada'}

File yang sudah pernah Pilot edit:
${filesEditedByPilotStr || 'Belum ada'}

Gunakan info ini untuk membuat kode yang konsisten dengan project.

Project context:
package.json:
${packageJsonStr.slice(0, 1000)}

Struktur folder src/:
${srcStructure.slice(0, 2000)}

File yang sudah dibuat di session ini:
${filesCreated || 'Belum ada'}

Request user: "${userRequest}"

Analisis:
1. Apa yang diminta user dengan tepat?
2. File apa yang perlu dibuat/diedit?
3. Ada dependency yang perlu diinstall?
4. Ada risiko / hal yang perlu ditanyakan ke user?

Jawab singkat HANYA dengan JSON murni tanpa markdown \`\`\`json block:
{
  "understood": "1 kalimat penjelasan apa yang akan dikerjakan",
  "needsClarification": false,
  "clarificationQuestion": null,
  "estimatedFiles": 3,
  "readFiles": ["src/app.ts"],
  "techStack": "misal: React, Express, dll"
}
`

  // Kita tidak simpan prompt sistem Think ini ke dalam history session user
  // Tapi kita build dari context history yang ada
  const historyContext = buildContext(projectPath)
  
  const messages: Message[] = [
    ...historyContext,
    {
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    {
      role: 'user',
      content: userRequest,
      timestamp: new Date().toISOString(),
    },
  ]

  const response = await sendWithFallback({
    messages,
    temperature: 0.2, // Rendah untuk format JSON stabil
  })

  try {
    let content = response.content.trim()
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '')
    }
    const result = JSON.parse(content) as ThinkResult
    return result
  } catch {
    // Fallback if parsing fails
    return {
      understood: 'Mengerjakan request: ' + userRequest,
      needsClarification: false,
      clarificationQuestion: null,
      estimatedFiles: 1,
      readFiles: [],
    }
  }
}
