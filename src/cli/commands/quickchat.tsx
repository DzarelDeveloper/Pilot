import React, { useState, useEffect } from 'react'
import { render, Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'
import { sendWithFallback, getLastSwitch, clearLastSwitch } from '../../router/fallback.js'
import { getOrCreateSession, appendMessage, buildContext } from '../../memory/index.js'
import type { Message } from '../../memory/types.js'

function QuickChatApp({ prompt }: { prompt: string }): React.ReactElement {
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [switchNotice, setSwitchNotice] = useState<string | null>(null)
  const [providerUsed, setProviderUsed] = useState<string | null>(null)

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        const projectPath = process.cwd()
        const session = getOrCreateSession(projectPath)

        const userMsg: Message = {
          role: 'user',
          content: prompt,
          timestamp: new Date().toISOString(),
        }
        appendMessage(session, userMsg)

        const messages = buildContext(projectPath)
        const result = await sendWithFallback({ messages })

        const assistantMsg: Message = {
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString(),
          provider: result.provider,
          model: result.model,
          tokensUsed: result.tokensUsed,
        }
        appendMessage(session, assistantMsg)

        const switchInfo = getLastSwitch()
        if (switchInfo) {
          setSwitchNotice(`${switchInfo.from} → ${switchInfo.to} (auto-switch)`)
          clearLastSwitch()
        }

        setProviderUsed(result.provider)
        setResponse(result.content)

        setTimeout(() => process.exit(0), 100)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setTimeout(() => process.exit(1), 100)
      }
    }
    run()
  }, [prompt])

  if (error) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="red" bold>✗ Error</Text>
        <Text color="gray">{error}</Text>
      </Box>
    )
  }

  if (!response) {
    return (
      <Box paddingX={2}>
        <Text color="cyan"><InkSpinner type="dots" /></Text>
        <Text color="gray"> Berpikir...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {switchNotice && (
        <Text color="yellow">  ◆ {switchNotice}</Text>
      )}
      <Text color="white">{response}</Text>
      {providerUsed && (
        <Text color="gray" dimColor>  [{providerUsed}]</Text>
      )}
    </Box>
  )
}

export function runQuickChat(prompt: string): void {
  render(<QuickChatApp prompt={prompt} />)
}
