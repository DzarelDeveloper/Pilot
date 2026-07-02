import React from 'react'
import { Box, Text } from 'ink'

interface GoodbyeScreenProps {
  requestCount: number
  activeProviders: string[]
  sessionDuration: number
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (totalMinutes < 1) return 'kurang dari semenit'
  if (hours === 0) return `${minutes} menit`
  return `${hours} jam ${minutes} menit`
}

export function GoodbyeScreen({ requestCount, activeProviders, sessionDuration }: GoodbyeScreenProps): React.ReactElement {
  const separator = '─'.repeat(42)
  const providerList = activeProviders.length > 0 ? activeProviders.join(' · ') : 'None'

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text dimColor>  {separator}</Text>
      <Text> </Text>
      <Text color="cyan" bold>    ◆ Thanks for using Pilot.</Text>
      <Text> </Text>
      <Text dimColor>      Session disimpan. Lanjutkan kapan saja dengan: <Text color="white">pilot</Text></Text>
      <Text> </Text>
      <Text dimColor>      Providers aktif: {providerList}</Text>
      <Text dimColor>      Total request session ini: {requestCount}</Text>
      <Text dimColor>      Waktu: {formatDuration(sessionDuration)}</Text>
      <Text> </Text>
      <Text dimColor>  {separator}</Text>
      <Text dimColor italic>  Build once, deploy anywhere. 🛩️</Text>
    </Box>
  )
}
