import { execSync } from 'node:child_process'
import { learnFromProject } from '../memory/projectMemory.js'
import { sendWithFallback } from '../router/fallback.js'
import type { Message } from '../memory/types.js'

export async function reviewChanges(
  projectPath: string,
  onChunk: (text: string) => void
): Promise<void> {
  onChunk('◆ Mengambil git diff...\n\n')

  let diff = ''
  try {
    // Try to get staged + unstaged changes compared to HEAD
    diff = execSync('git diff HEAD', { cwd: projectPath, encoding: 'utf-8' })
  } catch (err) {
    onChunk('Gagal menjalankan git diff. Pastikan ini adalah repositori Git dan ada commit sebelumnya.\n')
    return
  }

  if (!diff.trim()) {
    onChunk('Tidak ada perubahan yang perlu direview. Working tree clean.\n')
    return
  }

  const filesChanged = (diff.match(/^diff --git/gm) || []).length
  onChunk(`◆ Perubahan ditemukan pada ${filesChanged} file. Me-review kode...\n\n`)

  const knowledge = await learnFromProject(projectPath)

  const systemPrompt = `Kamu adalah code reviewer.
Konteks project: ${JSON.stringify(knowledge)}

Berikut adalah perubahan kode (git diff):
${diff}

Tugas:
1. Buat ringkasan apa saja yang berubah.
2. Identifikasi potensi masalah (bugs, performance, security).
3. Cek kesesuaian dengan konvensi project.
4. Berikan saran perbaikan (jika ada).

Gunakan bahasa yang jelas, format yang rapi, dan to the point.`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
    { role: 'user', content: 'Tolong review perubahan kode saya.', timestamp: new Date().toISOString() }
  ]

  const response = await sendWithFallback({ messages })

  const chunks = response.content.match(/\S+|\s+/g) || []
  for (const chunk of chunks) {
    onChunk(chunk)
    await new Promise(r => setTimeout(r, 20))
  }
}
