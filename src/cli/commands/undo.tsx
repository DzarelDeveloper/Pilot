import React from 'react'
import { render, Box, Text } from 'ink'

export function UndoApp(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="yellow" bold>◆ Undo (Belum Tersedia)</Text>
      <Text color="gray">Fitur undo akan hadir di v0.2.0.</Text>
      <Text color="gray">Silakan restore file manual dari folder .pilot-backup/</Text>
    </Box>
  )
}

export function runUndo(): void {
  render(<UndoApp />)
}
