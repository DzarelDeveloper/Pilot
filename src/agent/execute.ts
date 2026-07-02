import path from 'node:path'
import fs from 'node:fs'
import { sendWithFallback } from '../router/fallback.js'
import { buildContext, recordFileAction } from '../memory/index.js'
import { readFile, writeFile, editFile, runCommand } from '../tools/index.js'
import type { Session, Message } from '../memory/types.js'
import type { PlanResult, PlanStep } from './types.js'
import type { ProgressStep } from '../cli/ui/ProgressBar.js'

/**
 * Generate code untuk create / edit file.
 */
async function generateCode(
  session: Session,
  step: PlanStep,
  plan: PlanResult,
  originalContent?: string,
): Promise<string> {
  const isEdit = !!originalContent

  const systemPrompt = `
Kamu adalah Pilot, senior developer AI.
Tugasmu: ${isEdit ? 'Ubah' : 'Tulis'} kode untuk file \`${step.file}\`.

Alasan dari plan: ${step.reason}
Plan keseluruhan: ${plan.summary}

${isEdit ? `Konten file saat ini:\n\`\`\`\n${originalContent}\n\`\`\`\nBerikan KODE LENGKAP hasil perubahan (jangan hanya snippet atau diff).` : ''}

RULES:
- Ikuti naming convention yang umum.
- Tulis kode production-ready dengan error handling.
- Tulis HANYA kode tanpa penjelasan, tanpa markdown code block.
- Jangan tambahkan backticks \`\`\` disekitar kode.
`

  const messages: Message[] = [
    ...buildContext(session.projectPath),
    {
      role: 'system',
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    },
    {
      role: 'user',
      content: `Tulis kode lengkap untuk ${step.file}.`,
      timestamp: new Date().toISOString(),
    },
  ]

  const response = await sendWithFallback({
    messages,
    temperature: 0.1, // Sangat deterministik
  })

  let code = response.content.trim()
  
  // Cleanup markdown wrappers jika AI membandel
  const lines = code.split('\n')
  if (lines[0]?.startsWith('```')) {
    lines.shift()
    if (lines[lines.length - 1]?.startsWith('```')) {
      lines.pop()
    }
    code = lines.join('\n')
  }

  return code
}

/**
 * Execute satu step.
 * Callback onUpdate dipakai untuk render progres UI (DiffView, approval, ProgressBar).
 */
export async function executeStep(
  session: Session,
  step: PlanStep,
  plan: PlanResult,
  hooks: {
    onProgressUpdate: (update: Partial<ProgressStep>) => void
    onRequestDiffApproval: (file: string, diff: string) => Promise<boolean>
    onRequestCommandApproval: (command: string) => Promise<boolean>
    onRequestDeleteApproval: (file: string) => Promise<boolean>
  }
): Promise<void> {
  const projectPath = session.projectPath
  const absolutePath = path.join(projectPath, step.file)

  hooks.onProgressUpdate({ status: 'running' })

  switch (step.action) {
    case 'create': {
      const code = await generateCode(session, step, plan)
      const result = await writeFile(absolutePath, code)
      
      recordFileAction(projectPath, session.id, {
        action: 'created',
        path: step.file,
        at: new Date().toISOString(),
        sessionId: session.id,
        description: step.reason,
      })

      hooks.onProgressUpdate({ 
        status: 'done', 
        detail: `(${result.lines} baris)` 
      })
      break
    }

    case 'edit': {
      const { content: original } = await readFile(absolutePath)
      const newCode = await generateCode(session, step, plan, original)
      
      // Simulate dry run diff to show to user
      // We will compute simple diff internally
      let tmpCreated = false
      try {
        const dryRunEdit = await editFile(absolutePath + '.tmp_pilot', newCode, projectPath)
        tmpCreated = true

        const approved = await hooks.onRequestDiffApproval(step.file, dryRunEdit.diff)
        
        if (approved) {
          const result = await editFile(absolutePath, newCode, projectPath)
          
          recordFileAction(projectPath, session.id, {
            action: 'edited',
            path: step.file,
            at: new Date().toISOString(),
            sessionId: session.id,
            description: step.reason,
          })
          
          hooks.onProgressUpdate({ 
            status: 'done',
            detail: `(+${result.linesAdded} -${result.linesRemoved})`
          })
        } else {
          hooks.onProgressUpdate({ status: 'done', detail: '(dibatalkan user)' })
        }
      } finally {
        if (tmpCreated) {
          try { fs.unlinkSync(absolutePath + '.tmp_pilot') } catch { /* ignore */ }
        }
      }
      break
    }

    case 'delete': {
      const approved = await hooks.onRequestDeleteApproval(step.file)
      if (approved && fs.existsSync(absolutePath)) {
        // Backup before delete
        const backupDir = path.join(projectPath, '.pilot-backup')
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
        fs.copyFileSync(absolutePath, path.join(backupDir, `${Date.now()}-${path.basename(absolutePath)}`))
        
        fs.unlinkSync(absolutePath)
        
        recordFileAction(projectPath, session.id, {
          action: 'deleted',
          path: step.file,
          at: new Date().toISOString(),
          sessionId: session.id,
          description: step.reason,
        })
        hooks.onProgressUpdate({ status: 'done' })
      } else {
        hooks.onProgressUpdate({ status: 'done', detail: '(dibatalkan)' })
      }
      break
    }

    case 'run': {
      if (!step.command) {
        hooks.onProgressUpdate({ status: 'done', detail: '(no command)' })
        break
      }
      
      const approved = await hooks.onRequestCommandApproval(step.command)
      if (approved) {
        await runCommand(step.command, projectPath)
        hooks.onProgressUpdate({ status: 'done' })
      } else {
        hooks.onProgressUpdate({ status: 'done', detail: '(dibatalkan)' })
      }
      break
    }
  }
}
