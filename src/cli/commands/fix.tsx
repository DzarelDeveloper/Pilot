import { useState, useEffect, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import { TextInput } from '@inkjs/ui'
import { Spinner } from '../ui/Spinner.js'
import { PlanView } from '../ui/PlanView.js'
import { ProgressBar, type ProgressStep } from '../ui/ProgressBar.js'
import { DiffView } from '../ui/DiffView.js'
import { Summary, type SummaryProps } from '../ui/Summary.js'
import { executeStep, buildSummaryProps } from '../../agent/index.js'
import type { PlanResult } from '../../agent/types.js'
import { getOrCreateSession, appendMessage } from '../../memory/index.js'
import { updateAfterExecute } from '../../memory/projectMemory.js'
import { getLastSwitch } from '../../router/fallback.js'
import { extractFileFromError, resolveFilePath, analyzeBug } from '../../agent/fix.js'
import { backupForUndo } from '../../agent/undo.js'

type AppState = 
  | 'extracting'
  | 'ask-file'
  | 'planning' 
  | 'approval' 
  | 'executing' 
  | 'diff-approval' 
  | 'delete-approval' 
  | 'command-approval' 
  | 'done' 
  | 'error'

export function FixApp({ errorMsg, projectPath, onDone }: { errorMsg: string; projectPath: string; onDone?: (summary: string) => void }): React.ReactElement {
  const [state, setState] = useState<AppState>('extracting')
  const [errorMsgState, setErrorMsgState] = useState('')
  const [targetFile, setTargetFile] = useState<string | null>(null)
  
  const [planResult, setPlanResult] = useState<PlanResult | null>(null)
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  
  const [diffFile, setDiffFile] = useState('')
  const [diffOriginal, setDiffOriginal] = useState('')
  const [diffNewContent, setDiffNewContent] = useState('')
  const [deleteFile, setDeleteFile] = useState('')
  const [commandStr, setCommandStr] = useState('')
  
  const [summaryProps, setSummaryProps] = useState<SummaryProps | null>(null)
  const [startTime] = useState(Date.now())

  const resolveExecutionApproval = useRef<(value: boolean | 'quit') => void>()
  const sessionRef = useRef(getOrCreateSession(projectPath))

  // 1. Extract file
  useEffect(() => {
    if (state === 'extracting') {
      const extracted = extractFileFromError(errorMsg, projectPath)
      if (extracted) {
        setTargetFile(extracted)
        setState('planning')
      } else {
        setState('ask-file')
      }
    }
  }, [state, errorMsg, projectPath])

  // 2. Planning (analyze bug)
  useEffect(() => {
    async function runPlan(): Promise<void> {
      if (state === 'planning' && targetFile) {
        try {
          const planRes = await analyzeBug(errorMsg, targetFile, projectPath, sessionRef.current)
          setPlanResult(planRes)
          setProgressSteps(
            planRes.steps.map(s => ({
              id: s.id,
              action: s.action,
              file: s.file,
              status: 'waiting',
            }))
          )
          setState('approval')
        } catch (err) {
          setErrorMsgState(err instanceof Error ? err.message : String(err))
          setState('error')
        }
      }
    }
    runPlan()
  }, [state, targetFile, errorMsg, projectPath])

  // 3. Executing
  useEffect(() => {
    async function runExecute(): Promise<void> {
      if (state === 'executing' && planResult) {
        try {
          await backupForUndo(planResult.steps, projectPath, planResult.summary)
          let i = 0
          for (const step of planResult.steps) {
            await executeStep(sessionRef.current, step, planResult, {
              onProgressUpdate: (update) => {
                setProgressSteps(prev => {
                  const next = [...prev]
                  next[i] = { ...(next[i] as ProgressStep), ...update }
                  return next
                })
              },
              onRequestDiffApproval: async (file, original, newContent) => {
                setDiffFile(file)
                setDiffOriginal(original)
                setDiffNewContent(newContent)
                setState('diff-approval')
                const result = await new Promise<boolean | 'quit'>((resolve) => {
                  resolveExecutionApproval.current = resolve
                })
                setState('executing')
                return result
              },
              onRequestCommandApproval: async (command) => {
                setCommandStr(command)
                setState('command-approval')
                const result = await new Promise<boolean | 'quit'>((resolve) => {
                  resolveExecutionApproval.current = resolve
                })
                setState('executing')
                return result as boolean
              },
              onRequestDeleteApproval: async (file) => {
                setDeleteFile(file)
                setState('delete-approval')
                const result = await new Promise<boolean | 'quit'>((resolve) => {
                  resolveExecutionApproval.current = resolve
                })
                setState('executing')
                return result as boolean
              },
            })
            i++
          }

          // Summarize
          const createdFiles = progressSteps.filter(s => s.action === 'create' && s.status === 'done').map(s => {
            const step = planResult.steps.find(ps => ps.id === s.id)
            return { path: s.file, description: step?.reason || '' }
          })
          const editedFiles = progressSteps.filter(s => s.action === 'edit' && s.status === 'done').map(s => {
            const step = planResult.steps.find(ps => ps.id === s.id)
            return { path: s.file, description: step?.reason || '' }
          })
          await updateAfterExecute(projectPath, createdFiles, editedFiles)

          const switchInfo = getLastSwitch()
          const durationMs = Date.now() - startTime
          
          appendMessage(sessionRef.current, {
            role: 'assistant',
            content: 'Fix selesai diterapkan: ' + planResult.summary,
            timestamp: new Date().toISOString(),
          })

          const sProps = buildSummaryProps(
            planResult, 
            durationMs, 
            sessionRef.current.activeProvider || 'Ollama', 
            switchInfo ? 1 : 0
          )
          setSummaryProps(sProps)
          setState('done')
          
          if (onDone) {
            setTimeout(() => onDone(planResult.summary), 100)
          } else {
            setTimeout(() => process.exit(0), 100)
          }

        } catch (err) {
          setErrorMsgState(err instanceof Error ? err.message : String(err))
          setState('error')
        }
      }
    }
    runExecute()
  }, [state, planResult, progressSteps, projectPath, onDone, startTime])

  useInput((input, key) => {
    if (state === 'approval') {
      if (input.toLowerCase() === 'y' || key.return) {
        setState('executing')
      }
      if (input.toLowerCase() === 'n') {
        if (onDone) onDone('Fix dibatalkan oleh pengguna.')
        else process.exit(0)
      }
    } else if (state === 'diff-approval' || state === 'delete-approval' || state === 'command-approval') {
      if (input.toLowerCase() === 'y' || key.return) resolveExecutionApproval.current?.(true)
      if (input.toLowerCase() === 'n') resolveExecutionApproval.current?.(false)
      if (input.toLowerCase() === 'q') resolveExecutionApproval.current?.('quit')
    }
  })

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="red" bold>✗ Error</Text>
        <Text color="gray">{errorMsgState}</Text>
      </Box>
    )
  }

  if (state === 'extracting') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>◆ Fixing: {errorMsg}</Text>
        <Spinner text="Mencari file yang relevan..." />
      </Box>
    )
  }

  if (state === 'ask-file') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>◆ Fixing: {errorMsg}</Text>
        <Text color="yellow">Gagal menemukan file secara otomatis.</Text>
        <Box>
          <Text color="white">File mana yang terkait dengan error ini? </Text>
          <TextInput onSubmit={(val) => {
             const resolved = resolveFilePath(val, projectPath)
             if (resolved) {
                setTargetFile(resolved)
                setState('planning')
             } else {
                setErrorMsgState(`File ${val} tidak ditemukan.`)
                setState('error')
             }
          }} />
        </Box>
      </Box>
    )
  }

  if (state === 'planning') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>◆ Fixing: {errorMsg}</Text>
        <Text color="cyan" dimColor>◆ File terkait: {targetFile}</Text>
        <Spinner text="Menganalisis error & membuat plan perbaikan..." />
      </Box>
    )
  }

  if (state === 'approval' && planResult) {
    return (
      <PlanView 
        summary={planResult.summary} 
        steps={planResult.steps} 
        dependencies={planResult.dependencies}
        warnings={planResult.warnings}
      />
    )
  }

  if (state === 'executing' || state === 'diff-approval' || state === 'command-approval' || state === 'delete-approval') {
    return (
      <Box flexDirection="column">
        <ProgressBar 
          steps={progressSteps} 
          current={progressSteps.filter(s => s.status === 'done').length} 
          total={progressSteps.length} 
        />
        <Text> </Text>
        
        {state === 'diff-approval' && (
          <DiffView filePath={diffFile} original={diffOriginal} newContent={diffNewContent} />
        )}
        
        {state === 'command-approval' && (
          <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1}>
            <Text color="yellow" bold>~ Jalankan Perintah</Text>
            <Text color="gray">{'─'.repeat(50)}</Text>
            <Text color="blue">$ {commandStr}</Text>
            <Text color="gray">{'─'.repeat(50)}</Text>
            <Box>
              <Text color="white">Izinkan perintah ini? </Text>
              <Text color="green">(Y/n)</Text>
            </Box>
          </Box>
        )}
        
        {state === 'delete-approval' && (
          <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={2} paddingY={1}>
            <Text color="red" bold>- Hapus File</Text>
            <Text color="gray">{'─'.repeat(50)}</Text>
            <Text color="white">{deleteFile}</Text>
            <Text color="gray">{'─'.repeat(50)}</Text>
            <Box>
              <Text color="white">Yakin hapus file ini? </Text>
              <Text color="green">(Y/n)</Text>
            </Box>
          </Box>
        )}
      </Box>
    )
  }

  if (state === 'done' && summaryProps) {
    return <Summary {...summaryProps} />
  }

  return <></>
}
