import fs from 'node:fs'

export interface ReadFileResult {
  content: string
  lines: number
  exists: boolean
}

export async function readFile(filePath: string): Promise<ReadFileResult> {
  if (!fs.existsSync(filePath)) {
    return { content: '', lines: 0, exists: false }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').length

  return { content, lines, exists: true }
}
