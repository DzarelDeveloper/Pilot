import fs from 'node:fs'
import path from 'node:path'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.pilot-backup',
  '.pilot',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '__pycache__',
  '.venv',
  'venv',
])

export async function scanProject(
  rootPath: string,
  maxDepth: number = 2,
): Promise<FileTreeNode[]> {
  return scanDir(rootPath, 0, maxDepth)
}

function scanDir(dirPath: string, currentDepth: number, maxDepth: number): FileTreeNode[] {
  if (currentDepth >= maxDepth) {
    return []
  }

  if (!fs.existsSync(dirPath)) {
    return []
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env') {
      continue
    }

    if (IGNORE_DIRS.has(entry.name)) {
      continue
    }

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const children = scanDir(fullPath, currentDepth + 1, maxDepth)
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children,
      })
    } else {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
      })
    }
  }

  return nodes.sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
