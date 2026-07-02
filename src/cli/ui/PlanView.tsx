import React from 'react'
import { Box, Text } from 'ink'

interface PlanStep {
  id: number
  action: 'create' | 'edit' | 'delete' | 'run'
  file: string
  reason: string
  estimatedLines?: number
}

interface PlanViewProps {
  summary: string
  steps: PlanStep[]
  dependencies?: string[]
  warnings?: string[]
}

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  edit: 'yellow',
  delete: 'red',
  run: 'blue',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'create',
  edit: 'edit  ',
  delete: 'delete',
  run: 'run   ',
}

export function PlanView({
  summary,
  steps,
  dependencies,
  warnings,
}: PlanViewProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      {/* Header */}
      <Box>
        <Text color="cyan" bold>◆ Plan</Text>
      </Box>
      <Box>
        <Text color="white">  {summary}</Text>
      </Box>

      <Text color="gray">  {'─'.repeat(46)}</Text>

      {/* Steps */}
      {steps.map((step) => (
        <Box key={step.id} flexDirection="column" marginLeft={1}>
          <Box>
            <Text color="gray">{String(step.id).padStart(2, ' ')}  </Text>
            <Text color={ACTION_COLORS[step.action] ?? 'white'}>
              {ACTION_LABELS[step.action] ?? step.action}
            </Text>
            <Text color="white">  {step.file}</Text>
            {step.estimatedLines && step.action !== 'run' && (
              <Text color="gray">  ~{step.estimatedLines} baris</Text>
            )}
          </Box>
          <Box marginLeft={6}>
            <Text color="gray">{step.reason}</Text>
          </Box>
          <Text> </Text>
        </Box>
      ))}

      {/* Dependencies */}
      {dependencies && dependencies.length > 0 && (
        <Box flexDirection="column" marginLeft={1}>
          <Text color="blue">  Dependencies: {dependencies.join(', ')}</Text>
          <Text> </Text>
        </Box>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <Box flexDirection="column" marginLeft={1}>
          {warnings.map((w, i) => (
            <Text key={i} color="yellow">  ⚠ {w}</Text>
          ))}
          <Text> </Text>
        </Box>
      )}

      <Text color="gray">  {'─'.repeat(46)}</Text>

      {/* Approval prompt */}
      <Box>
        <Text color="white">  </Text>
        <Text color="green">[y] Lanjutkan</Text>
        <Text>   </Text>
        <Text color="red">[n] Batalkan</Text>
        <Text>   </Text>
        <Text color="yellow">[e] Edit plan</Text>
      </Box>
    </Box>
  )
}

export type { PlanStep, PlanViewProps }
