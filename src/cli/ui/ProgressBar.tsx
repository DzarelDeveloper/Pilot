import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'

interface ProgressStep {
  id: number
  action: string
  file: string
  status: 'done' | 'running' | 'waiting'
  detail?: string
}

interface ProgressBarProps {
  steps: ProgressStep[]
  current: number
  total: number
}

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  done: { icon: '✓', color: 'green' },
  running: { icon: '◌', color: 'cyan' },
  waiting: { icon: '○', color: 'gray' },
}

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  edit: 'yellow',
  delete: 'red',
  run: 'blue',
}

export function ProgressBar({
  steps,
  current,
  total,
}: ProgressBarProps): React.ReactElement {
  const barWidth = 20
  const filled = Math.round((current / total) * barWidth)
  const empty = barWidth - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percent = Math.round((current / total) * 100)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="space-between">
        <Text color="cyan" bold>◆ Mengerjakan...</Text>
        <Text color="gray">{current} / {total}</Text>
      </Box>

      <Text color="gray">{'─'.repeat(46)}</Text>

      {steps.map((step) => {
        const statusInfo = STATUS_ICONS[step.status] ?? STATUS_ICONS.waiting
        const actionColor = ACTION_COLORS[step.action] ?? 'white'

        return (
          <Box key={step.id}>
            <Text color={statusInfo.color}>
              {step.status === 'running' ? '' : `${statusInfo.icon} `}
            </Text>
            {step.status === 'running' && (
              <Text color="cyan">
                <InkSpinner type="dots" />{' '}
              </Text>
            )}
            <Text color={actionColor}>{step.action.padEnd(7)}</Text>
            <Text color="white"> {step.file}</Text>
            {step.detail && (
              <Text color="gray">  {step.detail}</Text>
            )}
          </Box>
        )
      })}

      <Text> </Text>

      <Box>
        <Text color="cyan">{bar}</Text>
        <Text color="gray">  {percent}%</Text>
      </Box>
    </Box>
  )
}

export type { ProgressStep, ProgressBarProps }
