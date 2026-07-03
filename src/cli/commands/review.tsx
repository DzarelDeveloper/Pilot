import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { reviewChanges } from '../../agent/review.js'

export function ReviewApp({
  projectPath,
  onDone
}: {
  projectPath: string
  onDone: (finalText: string) => void
}): React.ReactElement {
  const [text, setText] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function run(): Promise<void> {
      try {
        await reviewChanges(projectPath, (chunk) => {
          if (mounted) {
            setText(prev => prev + chunk)
          }
        })
        if (mounted) {
          setIsDone(true)
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err instanceof Error ? err.message : String(err))
          setIsDone(true)
        }
      }
    }
    run()
    return (): void => { mounted = false }
  }, [projectPath])

  useEffect(() => {
    if (isDone) {
      if (errorMsg) {
         onDone(`Error: ${errorMsg}`)
      } else {
         onDone(text)
      }
    }
  }, [isDone, errorMsg, text, onDone])

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan" bold>Pilot: </Text>
      <Text color="white">{text}</Text>
    </Box>
  )
}
