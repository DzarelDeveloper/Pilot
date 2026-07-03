import React from 'react'
import { Box, Text } from 'ink'

interface DiffLine {
  type: 'context' | 'added' | 'removed'
  content: string
  lineNumber: number
}

interface DiffChunk {
  header: string
  lines: DiffLine[]
}

function generateDiff(original: string, newContent: string): DiffChunk[] {
  if (original === newContent) return []

  const origLines = original.split('\n')
  const newLines = newContent.split('\n')
  
  if (original === '') {
    return [{
      header: `@@ -0,0 +1,${newLines.length} @@`,
      lines: newLines.map((line, i) => ({ type: 'added', content: line, lineNumber: i + 1 }))
    }]
  }

  const diffLines: { type: 'context' | 'added' | 'removed', content: string, origLineNum: number, newLineNum: number }[] = []
  
  let origIdx = 0
  let newIdx = 0
  
  while (origIdx < origLines.length || newIdx < newLines.length) {
    if (origIdx < origLines.length && newIdx < newLines.length && origLines[origIdx] === newLines[newIdx]) {
      diffLines.push({ type: 'context', content: origLines[origIdx]!, origLineNum: origIdx + 1, newLineNum: newIdx + 1 })
      origIdx++
      newIdx++
      continue
    }
    
    let resyncOrig = -1
    let resyncNew = -1
    const LOOKAHEAD = 10
    
    for (let i = 1; i < LOOKAHEAD && resyncOrig === -1; i++) {
      for (let j = 1; j < LOOKAHEAD; j++) {
        if (origIdx + i < origLines.length && newIdx + j < newLines.length && origLines[origIdx + i] === newLines[newIdx + j]) {
          resyncOrig = origIdx + i
          resyncNew = newIdx + j
          break
        }
      }
    }
    
    if (resyncOrig !== -1 && resyncNew !== -1) {
      while (origIdx < resyncOrig) {
        diffLines.push({ type: 'removed', content: origLines[origIdx]!, origLineNum: origIdx + 1, newLineNum: 0 })
        origIdx++
      }
      while (newIdx < resyncNew) {
        diffLines.push({ type: 'added', content: newLines[newIdx]!, origLineNum: 0, newLineNum: newIdx + 1 })
        newIdx++
      }
    } else {
      if (origIdx < origLines.length) {
        diffLines.push({ type: 'removed', content: origLines[origIdx]!, origLineNum: origIdx + 1, newLineNum: 0 })
        origIdx++
      }
      if (newIdx < newLines.length) {
        diffLines.push({ type: 'added', content: newLines[newIdx]!, origLineNum: 0, newLineNum: newIdx + 1 })
        newIdx++
      }
    }
  }

  const chunks: DiffChunk[] = []
  let inChunk = false
  let currentChunk: DiffLine[] = []
  
  for (let i = 0; i < diffLines.length; i++) {
    let nearbyChange = false
    for (let j = Math.max(0, i - 3); j <= Math.min(diffLines.length - 1, i + 3); j++) {
      if (diffLines[j]?.type !== 'context') {
        nearbyChange = true
        break
      }
    }
    
    if (nearbyChange) {
      const line = diffLines[i]!
      currentChunk.push({
        type: line.type,
        content: line.content,
        lineNumber: line.type === 'removed' ? line.origLineNum : line.newLineNum
      })
      inChunk = true
    } else {
      if (inChunk) {
        if (currentChunk.length > 0) {
          const firstLine = currentChunk[0]
          chunks.push({
            header: `@@ -${firstLine?.lineNumber},... +${firstLine?.lineNumber},... @@`,
            lines: [...currentChunk]
          })
        }
        currentChunk = []
        inChunk = false
      }
    }
  }
  
  if (currentChunk.length > 0) {
    const firstLine = currentChunk[0]
    chunks.push({
      header: `@@ -${firstLine?.lineNumber},... +${firstLine?.lineNumber},... @@`,
      lines: currentChunk
    })
  }

  return chunks
}

interface DiffViewProps {
  filePath: string
  original: string
  newContent: string
}

export function DiffView({ filePath, original, newContent }: DiffViewProps): React.ReactElement {
  const chunks = generateDiff(original, newContent)

  let addedCount = 0
  let removedCount = 0
  
  chunks.forEach(c => {
    c.lines.forEach(l => {
      if (l.type === 'added') addedCount++
      if (l.type === 'removed') removedCount++
    })
  })

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="white" bold>{filePath}</Text>
      <Text color="gray">{'─'.repeat(40)}</Text>

      {chunks.map((chunk, i) => (
        <Box key={i} flexDirection="column" marginBottom={1}>
          <Text color="cyan">{chunk.header}</Text>
          {chunk.lines.map((line, j) => {
            if (line.type === 'added') {
              return <Text key={j} color="green">{'+ '}{line.content}</Text>
            }
            if (line.type === 'removed') {
              return <Text key={j} color="red">{'- '}{line.content}</Text>
            }
            return <Text key={j} color="gray">{'  '}{line.content}</Text>
          })}
        </Box>
      ))}

      <Text color="gray" dimColor>{addedCount} baris ditambah · {removedCount} baris dihapus</Text>
      
      <Text color="gray">{'─'.repeat(40)}</Text>
      <Box>
        <Text color="white">Apply perubahan ke </Text>
        <Text color="cyan">{filePath}</Text>
        <Text color="white">?</Text>
      </Box>
      <Text color="gray">[Y] Ya, apply   [n] Skip file ini   [q] Batalkan semua</Text>
    </Box>
  )
}

export type { DiffViewProps, DiffChunk, DiffLine }
export { generateDiff }
