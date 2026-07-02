import React from 'react'
import { Box, Text } from 'ink'

interface WelcomeProps {
  version?: string
  activeProviders: string[]
  ollamaModel?: string
  ollamaAvailable?: boolean
}

export function Welcome({
  version = '0.1.0',
  activeProviders,
  ollamaModel,
  ollamaAvailable = false,
}: WelcomeProps): React.ReactElement {
  const providerDisplay = activeProviders.length > 0
    ? activeProviders.slice(0, 3).map((p) => `${p} ✓`).join('  ')
    : 'Belum ada provider aktif'

  const extraCount = Math.max(0, activeProviders.length - 3)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="center">
        <Text color="cyan" bold>
          ◆  P I L O T
        </Text>
      </Box>

      <Box justifyContent="center">
        <Text color="gray">Build once, deploy anywhere.</Text>
      </Box>

      <Text> </Text>

      <Box justifyContent="center">
        <Text color="gray">
          v{version}  ·  free forever
        </Text>
      </Box>

      <Text> </Text>

      <Box>
        <Text color="gray">    Provider aktif: </Text>
        <Text color="green">{providerDisplay}</Text>
        {extraCount > 0 && (
          <Text color="gray"> +{extraCount}</Text>
        )}
      </Box>

      {ollamaAvailable && ollamaModel && (
        <Box>
          <Text color="gray">    Ollama: </Text>
          <Text color="green">{ollamaModel} ✓</Text>
          <Text color="gray">  (local)</Text>
        </Box>
      )}

      {!ollamaAvailable && (
        <Box>
          <Text color="gray">    Ollama: </Text>
          <Text color="yellow">tidak terdeteksi</Text>
        </Box>
      )}

      <Text> </Text>

      <Box>
        <Text color="gray">    Ketik apapun untuk mulai...</Text>
      </Box>
      <Box>
        <Text color="cyan">    /help</Text>
        <Text color="gray">  </Text>
        <Text color="cyan">/status</Text>
        <Text color="gray">  </Text>
        <Text color="cyan">/exit</Text>
      </Box>
    </Box>
  )
}
