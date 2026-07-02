import React from 'react'
import { render, Box, Text } from 'ink'
import { getAllSessions } from '../../memory/index.js'

function SessionsApp(): React.ReactElement {
  const sessions = getAllSessions()

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="cyan" bold>◆ Session History</Text>
        <Text> </Text>
        <Text color="gray">Belum ada session. Mulai: pilot &quot;halo&quot;</Text>
      </Box>
    )
  }

  // Group by project path
  const grouped = new Map<string, typeof sessions>()
  for (const session of sessions) {
    const existing = grouped.get(session.projectPath) ?? []
    existing.push(session)
    grouped.set(session.projectPath, existing)
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Text color="cyan" bold>◆ Session History</Text>
      <Text color="gray">{'─'.repeat(50)}</Text>

      {Array.from(grouped.entries()).map(([projectPath, projectSessions]) => (
        <Box key={projectPath} flexDirection="column" marginTop={1}>
          <Text color="white" bold>Project: {projectPath}</Text>
          <Text> </Text>
          {projectSessions.map((s) => {
            const date = new Date(s.updatedAt)
            const relative = formatRelativeDate(date)
            return (
              <Box key={s.id}>
                <Text color="gray">  {s.projectHash}  </Text>
                <Text color="white">{relative.padEnd(16)}</Text>
                <Text color="gray">{s.messages.length} pesan</Text>
                {s.filesCreated.length > 0 && (
                  <Text color="green">   {s.filesCreated.length} file dibuat</Text>
                )}
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}

function formatRelativeDate(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days === 1) return 'kemarin'
  if (days < 7) return `${days} hari lalu`
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`
  return date.toLocaleDateString()
}

export function runSessions(): void {
  render(<SessionsApp />)
}
