import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'

interface SpinnerProps {
  text: string
  color?: string
}

export function Spinner({ text, color = 'cyan' }: SpinnerProps): React.ReactElement {
  return (
    <Box>
      <Text color={color}>
        <InkSpinner type="dots" />
      </Text>
      <Text color="gray"> {text}</Text>
    </Box>
  )
}
