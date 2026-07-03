import React, { useState, useEffect, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from './Spinner.js'
import { PlanView } from './PlanView.js'
import { thinkPhase, planPhase, executeStep } from '../../agent/index.js'
import type { ThinkResult, PlanResult } from '../../agent/types.js'
import { getOrCreateSession, appendMessage } from '../../memory/index.js'
import { updateAfterExecute } from '../../memory/projectMemory.js'

type AppState = 'thinking' | 'planning' | 'approval' | 'executing' | 'done' | 'error'

export function OneShotAgent({ prompt, projectPath }: { prompt: string; projectPath: string }): React.ReactElement | null {
  const [state, setState] = useState<AppState>('thinking')
  const [errorMsg, setErrorMsg] = useState('')
  const [thinkResult, setThinkResult] = useState<ThinkResult | null>(null)
  const [planResult, setPlanResult] = useState<PlanResult | null>(null)
  const [progressSteps, setProgressSteps] = useState<{id: number, file: string, action: string, status: string, detail?: string}[]>([])
  const [summaryData, setSummaryData] = useState<{fileCount: number, duration: string, provider: string} | null>(null)

  const resolveApproval = useRef<(value: boolean | 'edit') => void>()

  useEffect(() => {
    async function run() {
      try {
        const session = getOrCreateSession(projectPath)
        const startTime = Date.now()

        // THINK
        setState('thinking')
        const thinkRes = await thinkPhase(session, prompt)
        setThinkResult(thinkRes)

        // PLAN
        setState('planning')
        const planRes = await planPhase(session, prompt, thinkRes)
        setPlanResult(planRes)

        setProgressSteps(planRes.steps.map(s => ({
          id: s.id,
          file: s.file,
          action: s.action,
          status: 'waiting',
        })))

        // APPROVAL
        setState('approval')
        const planApproved = await new Promise<boolean | 'edit'>((resolve) => {
          resolveApproval.current = resolve
        })

        if (!planApproved || planApproved === 'edit') {
          process.exit(0)
        }

        // EXECUTE
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
            onRequestDiffApproval: async () => true, // auto approve
            onRequestCommandApproval: async () => true, // auto approve
            onRequestDeleteApproval: async () => true, // auto approve
          })
          i++
        }

        // SUMMARY
        const createdFiles = planRes.steps.filter(s => s.action === 'create').map(s => ({ path: s.file, description: s.reason }))
        const editedFiles = planRes.steps.filter(s => s.action === 'edit').map(s => ({ path: s.file, description: s.reason }))
        await updateAfterExecute(projectPath, createdFiles, editedFiles)

        appendMessage(session, {
          role: 'assistant',
          content: 'Tugas selesai dikerjakan: ' + planRes.summary,
          timestamp: new Date().toISOString(),
        })

        const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's'
        const provider = session.activeProvider || 'Ollama'
        setSummaryData({ fileCount: planRes.steps.length, duration, provider })
        setState('done')

        setTimeout(() => process.exit(0), 100)

      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setState('error')
        setTimeout(() => process.exit(1), 100)
      }
    }
    run()
  }, [prompt, projectPath])

  useInput((input, key) => {
    if (state === 'approval') {
      if (input.toLowerCase() === 'y' || key.return) resolveApproval.current?.(true)
      if (input.toLowerCase() === 'n') resolveApproval.current?.(false)
      if (input.toLowerCase() === 'e') resolveApproval.current?.('edit')
    }
  })

  if (state === 'error') {
    return <Box><Text color="red">✗ {errorMsg}</Text></Box>
  }
  if (state === 'thinking') {
    return <Spinner text="Membaca konteks project..." />
  }
  if (state === 'planning') {
    return <Spinner text="Membuat plan..." />
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
  if (state === 'executing') {
    return (
      <Box flexDirection="column">
        {progressSteps.map((s, idx) => {
          let icon = <Text color="gray">○</Text>
          let statusText = <Text color="gray">menunggu</Text>
          if (s.status === 'running') {
            icon = <Text color="cyan">◌</Text>
            statusText = <Text color="cyan">sedang...</Text>
          } else if (s.status === 'done') {
            icon = <Text color="green">✓</Text>
            statusText = <Text color="green">{s.action === 'create' ? 'dibuat' : (s.action === 'edit' ? 'diedit' : 'selesai')}</Text>
          }
          return (
            <Box key={idx}>
              <Box width={3}>{icon}</Box>
              <Box width={25}><Text>{s.file}</Text></Box>
              <Box width={12}>{statusText}</Box>
              {s.detail && <Text color="gray"> {s.detail}</Text>}
            </Box>
          )
        })}
      </Box>
    )
  }
  if (state === 'done' && summaryData) {
    return (
      <Box>
        <Text color="green">✓</Text>
        <Text> Selesai — {summaryData.fileCount} file · {summaryData.duration} · {summaryData.provider}</Text>
      </Box>
    )
  }

  return null
}
