import React from 'react'
import { Box, Text } from 'ink'

interface DiffViewProps {
  filePath: string
  diff: string
}

export function DiffView({ filePath, diff }: DiffViewProps): React.ReactElement {
  const lines = diff.split('\n')

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
    >
      <Box>
        <Text color="yellow" bold>~ Edit: </Text>
        <Text color="white">{filePath}</Text>
      </Box>

      <Text color="gray">{'─'.repeat(50)}</Text>

      {lines.slice(0, 50).map((line, i) => {
        let color = 'white'
        if (line.startsWith('+ ')) color = 'green'
        else if (line.startsWith('- ')) color = 'red'
        else if (line.startsWith('  ')) color = 'gray'

        return (
          <Text key={i} color={color}>
            {line}
          </Text>
        )
      })}

      {lines.length > 50 && (
        <Text color="gray">  ... ({lines.length - 50} baris lagi)</Text>
      )}

      <Text color="gray">{'─'.repeat(50)}</Text>

      <Box>
        <Text color="white">Apply perubahan ini? </Text>
        <Text color="green">(Y/n)</Text>
      </Box>
    </Box>
  )
}

export type { DiffViewProps }
