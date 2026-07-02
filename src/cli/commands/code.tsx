import React, { useState, useEffect, useRef } from 'react'
import { render, Box, Text, useInput } from 'ink'
import { Spinner } from '../ui/Spinner.js'
import { PlanView } from '../ui/PlanView.js'
import { ProgressBar, type ProgressStep } from '../ui/ProgressBar.js'
import { DiffView } from '../ui/DiffView.js'
import { Summary, type SummaryProps } from '../ui/Summary.js'
import { thinkPhase, planPhase, executeStep, buildSummaryProps } from '../../agent/index.js'
import type { ThinkResult, PlanResult } from '../../agent/types.js'
import { getOrCreateSession, appendMessage } from '../../memory/index.js'
import { getLastSwitch } from '../../router/fallback.js'

type AppState = 
  | 'thinking' 
  | 'planning' 
  | 'approval' 
  | 'executing' 
  | 'diff-approval' 
  | 'delete-approval' 
  | 'command-approval' 
  | 'done' 
  | 'error'

export function CodeApp({ prompt, projectPath, onDone }: { prompt: string; projectPath: string; onDone?: () => void }): React.ReactElement {
  const [state, setState] = useState<AppState>('thinking')
  const [errorMsg, setErrorMsg] = useState('')
  
  const [thinkResult, setThinkResult] = useState<ThinkResult | null>(null)
  const [planResult, setPlanResult] = useState<PlanResult | null>(null)
  
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  
  const [diffFile, setDiffFile] = useState('')
  const [diffContent, setDiffContent] = useState('')
  const [deleteFile, setDeleteFile] = useState('')
  const [commandStr, setCommandStr] = useState('')
  
  const [summaryProps, setSummaryProps] = useState<SummaryProps | null>(null)

  // Promise resolvers for blocking user input
  const resolveApproval = useRef<(value: boolean | 'edit') => void>()
  const resolveExecutionApproval = useRef<(value: boolean) => void>()

  useEffect(() => {
    async function run() {
      try {
        const session = getOrCreateSession(projectPath)
        const startTime = Date.now()

        // Phase 1: Think
        setState('thinking')
        const thinkRes = await thinkPhase(session, prompt)
        setThinkResult(thinkRes)

        // Phase 2: Plan
        setState('planning')
        const planRes = await planPhase(session, prompt, thinkRes)
        setPlanResult(planRes)

        // Initialize progress steps
        setProgressSteps(
          planRes.steps.map(s => ({
            id: s.id,
            action: s.action,
            file: s.file,
            status: 'waiting',
          }))
        )

        // Phase 3: Plan Approval
        setState('approval')
        const planApproved = await new Promise<boolean | 'edit'>((resolve) => {
          resolveApproval.current = resolve
        })

        if (planApproved === false) {
          // Cancelled
          if (onDone) {
            onDone()
            return
          }
          process.exit(0)
        }

        if (planApproved === 'edit') {
          // TODO: implement edit plan via editor
          // MVP: cancel for now
          if (onDone) {
            onDone()
            return
          }
          process.exit(0)
        }

        // Phase 4: Execute
        setState('executing')
        let i = 0
        for (const step of planRes.steps) {
          
          await executeStep(session, step, planRes, {
            onProgressUpdate: (update) => {
              setProgressSteps(prev => {
                const next = [...prev]
                next[i] = { ...next[i]!, ...update }
                return next
              })
            },
            onRequestDiffApproval: async (file, diff) => {
              setDiffFile(file)
              setDiffContent(diff)
              setState('diff-approval')
              const result = await new Promise<boolean>((resolve) => {
                resolveExecutionApproval.current = resolve
              })
              setState('executing')
              return result
            },
            onRequestCommandApproval: async (command) => {
              setCommandStr(command)
              setState('command-approval')
              const result = await new Promise<boolean>((resolve) => {
                resolveExecutionApproval.current = resolve
              })
              setState('executing')
              return result
            },
            onRequestDeleteApproval: async (file) => {
              setDeleteFile(file)
              setState('delete-approval')
              const result = await new Promise<boolean>((resolve) => {
                resolveExecutionApproval.current = resolve
              })
              setState('executing')
              return result
            },
          })
          i++
        }

        // Phase 5: Summarize
        const switchInfo = getLastSwitch()
        const durationMs = Date.now() - startTime
        
        // append final assistant message summarizing the action
        appendMessage(session, {
          role: 'assistant',
          content: 'Tugas selesai dikerjakan: ' + planRes.summary,
          timestamp: new Date().toISOString(),
        })

        const sProps = buildSummaryProps(
          planRes, 
          durationMs, 
          session.activeProvider || 'Ollama', 
          switchInfo ? 1 : 0
        )
        setSummaryProps(sProps)
        setState('done')
        
        if (onDone) {
          setTimeout(() => onDone(), 100)
        } else {
          setTimeout(() => process.exit(0), 100)
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setState('error')
        if (onDone) {
          setTimeout(() => onDone(), 100)
        } else {
          setTimeout(() => process.exit(1), 100)
        }
      }
    }
    run()
  }, [prompt, projectPath])

  useInput((input, key) => {
    if (state === 'approval') {
      if (input.toLowerCase() === 'y' || key.return) resolveApproval.current?.(true)
      if (input.toLowerCase() === 'n') resolveApproval.current?.(false)
      if (input.toLowerCase() === 'e') resolveApproval.current?.('edit')
    } else if (state === 'diff-approval' || state === 'delete-approval' || state === 'command-approval') {
      if (input.toLowerCase() === 'y' || key.return) resolveExecutionApproval.current?.(true)
      if (input.toLowerCase() === 'n') resolveExecutionApproval.current?.(false)
    }
  })

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="red" bold>✗ Error</Text>
        <Text color="gray">{errorMsg}</Text>
      </Box>
    )
  }

  if (state === 'thinking') {
    return <Spinner text="Membaca konteks project..." />
  }

  if (state === 'planning') {
    return (
      <Box flexDirection="column">
        <Text color="cyan" dimColor>◆ Analisis: {thinkResult?.understood}</Text>
        <Spinner text="Membuat plan..." />
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
          <DiffView filePath={diffFile} diff={diffContent} />
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

export function runCode(prompt: string): void {
  render(<CodeApp prompt={prompt} projectPath={process.cwd()} />)
}
