import React from 'react'
import { Box, Text } from 'ink'

interface FileAction {
  action: 'created' | 'edited' | 'deleted'
  path: string
  lines?: number
}

interface SummaryProps {
  title: string
  files: FileAction[]
  commands?: string[]
  duration: string
  provider: string
  switchCount?: number
  suggestion?: string
}

const ACTION_SYMBOLS: Record<string, { symbol: string; color: string }> = {
  created: { symbol: '+', color: 'green' },
  edited: { symbol: '~', color: 'yellow' },
  deleted: { symbol: '-', color: 'red' },
}

export function Summary({
  title,
  files,
  commands,
  duration,
  provider,
  switchCount = 0,
  suggestion,
}: SummaryProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="green"
      paddingX={2}
      paddingY={1}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Box>
          <Text color="green" bold>✓ Selesai</Text>
          <Text color="gray"> — {title}</Text>
        </Box>
        <Text color="gray">{duration}</Text>
      </Box>

      <Text color="gray">{'─'.repeat(50)}</Text>

      {/* Files created */}
      {files.filter((f) => f.action === 'created').length > 0 && (
        <Box flexDirection="column">
          <Text color="white" bold>  File dibuat:</Text>
          {files
            .filter((f) => f.action === 'created')
            .map((f, i) => (
              <Box key={i}>
                <Text color={ACTION_SYMBOLS.created.color}>
                  {'  '}
                  {ACTION_SYMBOLS.created.symbol} {f.path}
                </Text>
                {f.lines && <Text color="gray">  ({f.lines} baris)</Text>}
              </Box>
            ))}
          <Text> </Text>
        </Box>
      )}

      {/* Files edited */}
      {files.filter((f) => f.action === 'edited').length > 0 && (
        <Box flexDirection="column">
          <Text color="white" bold>  File diedit:</Text>
          {files
            .filter((f) => f.action === 'edited')
            .map((f, i) => (
              <Box key={i}>
                <Text color={ACTION_SYMBOLS.edited.color}>
                  {'  '}
                  {ACTION_SYMBOLS.edited.symbol} {f.path}
                </Text>
                {f.lines && <Text color="gray">  ({f.lines} baris)</Text>}
              </Box>
            ))}
          <Text> </Text>
        </Box>
      )}

      {/* Files deleted */}
      {files.filter((f) => f.action === 'deleted').length > 0 && (
        <Box flexDirection="column">
          <Text color="white" bold>  File dihapus:</Text>
          {files
            .filter((f) => f.action === 'deleted')
            .map((f, i) => (
              <Box key={i}>
                <Text color={ACTION_SYMBOLS.deleted.color}>
                  {'  '}
                  {ACTION_SYMBOLS.deleted.symbol} {f.path}
                </Text>
              </Box>
            ))}
          <Text> </Text>
        </Box>
      )}

      {/* Commands run */}
      {commands && commands.length > 0 && (
        <Box flexDirection="column">
          <Text color="white" bold>  Dijalankan:</Text>
          {commands.map((cmd, i) => (
            <Text key={i} color="blue">  $ {cmd}</Text>
          ))}
          <Text> </Text>
        </Box>
      )}

      {/* Provider info */}
      <Box>
        <Text color="gray">  Provider: </Text>
        <Text color="white">{provider}</Text>
        {switchCount > 0 && (
          <Text color="yellow"> (auto-switch {switchCount}x)</Text>
        )}
      </Box>

      {/* Suggestion */}
      {suggestion && (
        <Box marginTop={1}>
          <Text color="cyan">  Selanjutnya: </Text>
          <Text color="white">{suggestion}</Text>
        </Box>
      )}
    </Box>
  )
}

export type { SummaryProps, FileAction }
