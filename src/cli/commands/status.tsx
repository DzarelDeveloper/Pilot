import React, { useState, useEffect } from 'react'
import { render, Box, Text } from 'ink'
import { Spinner } from '../ui/Spinner.js'
import { getResolvedProviders } from '../../router/providers/index.js'
import { detectOllama } from '../../router/providers/ollama.js'
import type { ProviderConfig } from '../../router/providers/types.js'
import type { OllamaStatus } from '../../router/providers/types.js'

function StatusApp(): React.ReactElement {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const resolved = getResolvedProviders()
    setProviders(resolved)

    detectOllama().then((status) => {
      setOllamaStatus(status)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <Spinner text="Mengecek status provider..." />
  }

  const cloudProviders = providers.filter((p) => !p.isLocal)
  const activeCount = cloudProviders.filter((p) => p.status === 'active').length
  const rateLimitedCount = cloudProviders.filter((p) => p.status === 'rate-limited').length
  const unconfiguredCount = cloudProviders.filter((p) => p.status === 'unconfigured').length

  const statusIcon = (p: ProviderConfig): string => {
    switch (p.status) {
      case 'active': return '✓'
      case 'rate-limited': return '✗'
      case 'error': return '✗'
      default: return '○'
    }
  }

  const statusColor = (p: ProviderConfig): string => {
    switch (p.status) {
      case 'active': return 'green'
      case 'rate-limited': return 'red'
      case 'error': return 'red'
      default: return 'gray'
    }
  }

  const statusText = (p: ProviderConfig): string => {
    switch (p.status) {
      case 'active': return 'aktif'
      case 'rate-limited': {
        if (p.rateLimitResetAt) {
          const mins = Math.round((p.rateLimitResetAt.getTime() - Date.now()) / 60000)
          return `rate-limit  reset dalam ${mins}m`
        }
        return 'rate-limit'
      }
      case 'error': return 'error'
      default: return 'belum setup'
    }
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
    >
      <Text color="cyan" bold>◆ Provider Status</Text>
      <Text color="gray">{'─'.repeat(50)}</Text>

      {cloudProviders.map((p) => (
        <Box key={p.name}>
          <Text color={statusColor(p)}>  {statusIcon(p)}  </Text>
          <Text color="white">{p.displayName.padEnd(16)}</Text>
          <Text color={statusColor(p)}>{statusText(p)}</Text>
          {p.status === 'active' && (
            <Text color="gray">  (cloud · prioritas {p.priority})</Text>
          )}
        </Box>
      ))}

      <Text color="gray">{'─'.repeat(50)}</Text>

      {/* Ollama */}
      {ollamaStatus?.available ? (
        <Box>
          <Text color="green">  ✓  </Text>
          <Text color="white">{'Ollama'.padEnd(16)}</Text>
          <Text color="green">aktif · lokal</Text>
          {ollamaStatus.models && ollamaStatus.models.length > 0 && (
            <Text color="gray"> ({ollamaStatus.models.slice(0, 3).join(', ')})</Text>
          )}
        </Box>
      ) : (
        <Box>
          <Text color="gray">  ○  </Text>
          <Text color="white">{'Ollama'.padEnd(16)}</Text>
          <Text color="gray">tidak terdeteksi</Text>
        </Box>
      )}

      <Text color="gray">{'─'.repeat(50)}</Text>

      {/* Summary */}
      <Box>
        <Text color="white">  {activeCount} cloud aktif</Text>
        <Text color="gray"> · </Text>
        <Text color="yellow">{rateLimitedCount} rate-limited</Text>
        <Text color="gray"> · </Text>
        <Text color="gray">{unconfiguredCount} belum setup</Text>
      </Box>

      {ollamaStatus?.available ? (
        <Text color="green">  Ollama: ON ← offline backup siap</Text>
      ) : (
        <Text color="gray">  Ollama: OFF</Text>
      )}

      <Text> </Text>
      <Text color="gray">  Tambah provider: pilot init</Text>
    </Box>
  )
}

export function runStatus(): void {
  render(<StatusApp />)
}
