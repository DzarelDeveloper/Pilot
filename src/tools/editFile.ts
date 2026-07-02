import fs from 'node:fs'
import path from 'node:path'

export interface EditFileResult {
  diff: string
  linesAdded: number
  linesRemoved: number
}

/**
 * Simpan backup ke .pilot-backup/ sebelum edit.
 */
function createBackup(filePath: string, projectRoot: string): void {
  const backupDir = path.join(projectRoot, '.pilot-backup')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = Date.now()
  const basename = path.basename(filePath)
  const backupPath = path.join(backupDir, `${timestamp}-${basename}`)

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath)
  }
}

/**
 * Simple line-by-line diff generation.
 */
function generateDiff(original: string, modified: string): string {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')
  const diffLines: string[] = []

  const maxLen = Math.max(origLines.length, modLines.length)

  for (let i = 0; i < maxLen; i++) {
    const origLine = origLines[i]
    const modLine = modLines[i]

    if (origLine === undefined && modLine !== undefined) {
      diffLines.push(`+ ${modLine}`)
    } else if (origLine !== undefined && modLine === undefined) {
      diffLines.push(`- ${origLine}`)
    } else if (origLine !== modLine) {
      diffLines.push(`- ${origLine}`)
      diffLines.push(`+ ${modLine}`)
    } else {
      diffLines.push(`  ${origLine}`)
    }
  }

  return diffLines.join('\n')
}

export async function editFile(
  filePath: string,
  newContent: string,
  projectRoot: string,
): Promise<EditFileResult> {
  // Baca file asli
  const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''

  // Simpan backup
  createBackup(filePath, projectRoot)

  // Tulis newContent
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, newContent, 'utf-8')

  // Hitung diff
  const diff = generateDiff(original, newContent)
  const origLineCount = original ? original.split('\n').length : 0
  const newLineCount = newContent.split('\n').length

  return {
    diff,
    linesAdded: Math.max(0, newLineCount - origLineCount),
    linesRemoved: Math.max(0, origLineCount - newLineCount),
  }
}
