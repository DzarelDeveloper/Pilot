import fs from 'node:fs'
import path from 'node:path'
import type { PlanStep } from './types.js'

export interface UndoEntry {
  action: 'created' | 'edited' | 'deleted'
  file: string
  originalContent: string | null  // null jika file baru (created)
  timestamp: string
}

export interface UndoManifest {
  entries: UndoEntry[]
  planSummary: string
  createdAt: string
}

const getUndoPath = (projectPath: string): string => {
  const backupDir = path.join(projectPath, '.pilot-backup')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
  return path.join(backupDir, 'undo.json')
}

/**
 * Membuat backup state file-file yang akan dimodifikasi oleh plan.
 * Dipanggil SEBELUM eksekusi plan dimulai.
 */
export async function backupForUndo(
  steps: PlanStep[],
  projectPath: string,
  planSummary: string
): Promise<void> {
  const entries: UndoEntry[] = []

  for (const step of steps) {
    const absolutePath = path.join(projectPath, step.file)

    switch (step.action) {
      case 'create':
        // File belum ada, saat undo kita hapus
        entries.push({
          action: 'created',
          file: step.file,
          originalContent: null,
          timestamp: new Date().toISOString(),
        })
        break

      case 'edit':
        // Simpan konten asli sebelum diedit
        if (fs.existsSync(absolutePath)) {
          entries.push({
            action: 'edited',
            file: step.file,
            originalContent: fs.readFileSync(absolutePath, 'utf-8'),
            timestamp: new Date().toISOString(),
          })
        }
        break

      case 'delete':
        // Simpan konten file sebelum dihapus
        if (fs.existsSync(absolutePath)) {
          entries.push({
            action: 'deleted',
            file: step.file,
            originalContent: fs.readFileSync(absolutePath, 'utf-8'),
            timestamp: new Date().toISOString(),
          })
        }
        break

      case 'run':
        // Command tidak bisa di-undo, skip
        break
    }
  }

  const manifest: UndoManifest = {
    entries,
    planSummary,
    createdAt: new Date().toISOString(),
  }

  fs.writeFileSync(getUndoPath(projectPath), JSON.stringify(manifest, null, 2))
}

/**
 * Menjalankan undo: mengembalikan semua file ke state sebelum eksekusi terakhir.
 */
export async function runUndo(
  projectPath: string,
  onProgress: (msg: string) => void
): Promise<boolean> {
  const undoPath = getUndoPath(projectPath)

  if (!fs.existsSync(undoPath)) {
    onProgress('Tidak ada eksekusi yang bisa di-undo.\n')
    return false
  }

  let manifest: UndoManifest
  try {
    manifest = JSON.parse(fs.readFileSync(undoPath, 'utf-8')) as UndoManifest
  } catch {
    onProgress('File undo.json rusak atau tidak valid.\n')
    return false
  }

  if (manifest.entries.length === 0) {
    onProgress('Tidak ada perubahan yang bisa di-undo.\n')
    return false
  }

  onProgress(`◆ Membatalkan eksekusi: "${manifest.planSummary}"\n`)
  onProgress(`  (${manifest.entries.length} file akan dikembalikan)\n\n`)

  let restoredCount = 0

  for (const entry of manifest.entries) {
    const absolutePath = path.join(projectPath, entry.file)

    switch (entry.action) {
      case 'created':
        // File dibuat oleh Pilot → hapus
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath)
          onProgress(`  ✗ Dihapus: ${entry.file}\n`)
          restoredCount++
        } else {
          onProgress(`  ○ Skip (sudah tidak ada): ${entry.file}\n`)
        }
        break

      case 'edited':
        // File diedit oleh Pilot → restore konten asli
        if (entry.originalContent !== null) {
          // Pastikan direktori ada
          const dir = path.dirname(absolutePath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

          fs.writeFileSync(absolutePath, entry.originalContent)
          onProgress(`  ✓ Dikembalikan: ${entry.file}\n`)
          restoredCount++
        }
        break

      case 'deleted':
        // File dihapus oleh Pilot → restore file
        if (entry.originalContent !== null) {
          const dir = path.dirname(absolutePath)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

          fs.writeFileSync(absolutePath, entry.originalContent)
          onProgress(`  ✓ Dikembalikan: ${entry.file}\n`)
          restoredCount++
        }
        break
    }
  }

  // Hapus undo manifest setelah digunakan (one-shot undo)
  fs.unlinkSync(undoPath)

  onProgress(`\n◆ Undo selesai: ${restoredCount} file dikembalikan.\n`)
  return true
}
