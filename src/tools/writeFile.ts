import fs from 'node:fs'
import path from 'node:path'

export interface WriteFileResult {
  path: string
  lines: number
  bytesWritten: number
}

export async function writeFile(filePath: string, content: string): Promise<WriteFileResult> {
  // Buat parent folder jika belum ada (mkdir -p)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, content, 'utf-8')

  const lines = content.split('\n').length
  const bytesWritten = Buffer.byteLength(content, 'utf-8')

  return { path: filePath, lines, bytesWritten }
}
