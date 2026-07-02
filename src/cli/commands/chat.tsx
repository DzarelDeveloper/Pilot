import React, { useState, useEffect } from 'react'
import { render, Box, Text } from 'ink'
import { Spinner } from '../ui/Spinner.js'
import { sendWithFallback, getLastSwitch, clearLastSwitch } from '../../router/fallback.js'
import { getOrCreateSession, appendMessage } from '../../memory/index.js'
import { buildContext } from '../../memory/index.js'
import type { Message } from '../../memory/types.js'

interface ChatOneProps {
  prompt: string
  projectPath: string
}

function ChatOneApp({ prompt, projectPath }: ChatOneProps): React.ReactElement {
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [switchNotice, setSwitchNotice] = useState<string | null>(null)

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        const session = getOrCreateSession(projectPath)

        // Add user message
        const userMsg: Message = {
          role: 'user',
          content: prompt,
          timestamp: new Date().toISOString(),
        }
        appendMessage(session, userMsg)

        // Build context with history
        const messages = buildContext(projectPath)

        // Send to provider
        const result = await sendWithFallback({ messages })

        // Save assistant message
        const assistantMsg: Message = {
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString(),
          provider: result.provider,
          model: result.model,
          tokensUsed: result.tokensUsed,
        }
        appendMessage(session, assistantMsg)

        // Check if provider switched
        const switchInfo = getLastSwitch()
        if (switchInfo) {
          setSwitchNotice(
            `${switchInfo.from} → ${switchInfo.to} (auto-switch)`,
          )
          clearLastSwitch()
          setTimeout(() => setSwitchNotice(null), 2000)
        }

        setResponse(result.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
    run()
  }, [prompt, projectPath])

  if (error) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color="red">✗ Error</Text>
        <Text color="gray">{error}</Text>
      </Box>
    )
  }

  if (!response) {
    return <Spinner text="Berpikir..." />
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      {switchNotice && (
        <Text color="yellow">  ◆ {switchNotice}</Text>
      )}
      <Text color="white">{response}</Text>
    </Box>
  )
}

export function runChat(prompt: string, projectPath: string): void {
  render(<ChatOneApp prompt={prompt} projectPath={projectPath} />)
}
