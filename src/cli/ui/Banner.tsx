import React from 'react'
import { Box, Text } from 'ink'

export function Banner({ columns }: { columns: number }): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>{`╔═══════════════════════════════════════╗`}</Text>
      <Text color="cyan" bold>{`██████╗ ██╗██╗      ██████╗ ████████╗  `}</Text>
      <Text color="cyan" bold>{`██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝  `}</Text>
      <Text color="blue" bold>{`██████╔╝██║██║     ██║   ██║   ██║     `}</Text>
      <Text color="blue" bold>{`██╔═══╝ ██║██║     ██║   ██║   ██║     `}</Text>
      <Text color="blue" bold>{`██║     ██║███████╗╚██████╔╝   ██║     `}</Text>
      <Text color="blue" bold>{`╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝     `}</Text>
      <Text dimColor>{`╚═══════════════════════════════════════╝`}</Text>
      <Text> </Text>
      <Box>
        <Text color="cyan">  ◆ </Text>
        <Text color="white" bold>Build once, deploy anywhere.</Text>
      </Box>
      <Text dimColor>    v0.1.0  ·  free forever  ·  9 providers</Text>
      <Text dimColor>{'─'.repeat(columns || 60)}</Text>
    </Box>
  )
}
