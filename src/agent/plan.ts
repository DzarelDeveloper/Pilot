import { sendWithFallback } from '../router/fallback.js'
import { buildContext } from '../memory/index.js'
import { readFile } from '../tools/readFile.js'
import path from 'node:path'
import type { Session, Message } from '../memory/types.js'
import type { ThinkResult, PlanResult } from './types.js'

export async function planPhase(
  session: Session,
  userRequest: string,
  thinkResult: ThinkResult,
): Promise<PlanResult> {
  const projectPath = session.projectPath

  // Baca konten dari readFiles yang disarankan di fase think
  let fileContents = ''
  for (const file of thinkResult.readFiles || []) {
    const filePath = path.join(projectPath, file)
    const result = await readFile(filePath)
    if (result.exists) {
      fileContents += `\n--- ${file} ---\n${result.content}\n`
    }
  }

  const systemPrompt = `
Kamu adalah Pilot, AI coding agent.
Buat PLAN yang konkret dan actionable berdasarkan request user.

Request: "${userRequest}"
Analisis sebelumnya: ${thinkResult.understood}

Existing files yang sudah dibaca (sebagai referensi):
${fileContents.slice(0, 4000)}

Buat plan dalam format JSON PERSIS seperti ini, tidak ada teks lain:
{
  "summary": "Membuat REST API login dengan JWT authentication",
  "steps": [
    {
      "id": 1,
      "action": "create",
      "file": "src/auth/jwt.ts",
      "reason": "Helper untuk generate dan verify JWT token",
      "estimatedLines": 35
    },
    {
      "id": 2,
      "action": "edit",
      "file": "src/app.ts",
      "reason": "Register login route ke Express app",
      "estimatedLines": 3
    },
    {
      "id": 3,
      "action": "run",
      "file": "",
      "command": "npm install jsonwebtoken",
      "reason": "Install dependency"
    }
  ],
  "dependencies": ["jsonwebtoken"],
  "warnings": []
}

Aturan "action" HANYA boleh: "create" | "edit" | "delete" | "run"
Jika "action" adalah "run", isi field "command" dengan perintah shell yang akan dijalankan.
Jangan sertakan markdown code block (\`\`\`json). Output HANYA raw JSON.
`

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
    temperature: 0.2,
  })

  try {
    let content = response.content.trim()
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '')
    }
    const result = JSON.parse(content) as PlanResult
    return result
  } catch (error) {
    throw new Error(`Gagal mem-parsing plan dari AI: ${error}\nResponse: ${response.content}`)
  }
}
