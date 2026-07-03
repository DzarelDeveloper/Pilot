import fs from 'node:fs'
import path from 'node:path'
import { learnFromProject } from '../memory/projectMemory.js'
import { sendWithFallback } from '../router/fallback.js'
import type { Message } from '../memory/types.js'

export async function explainCode(
  input: string,
  projectPath: string,
  onChunk: (text: string) => void
): Promise<void> {
  let fileContent = ''
  let targetPath = ''

  if (!input.trim()) {
    onChunk('Silakan masukkan nama file atau potongan kode yang ingin dijelaskan.')
    return
  }

  // 1. Deteksi apakah input adalah file path atau kode langsung
  const absolutePath = path.resolve(projectPath, input)
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    targetPath = absolutePath
    fileContent = fs.readFileSync(absolutePath, 'utf-8')
  } else {
    // Coba cari di src/ secara rekursif jika ada ekstensi file (mengandung titik)
    const ext = path.extname(input)
    if (ext) {
      const found = findFileRecursively(path.join(projectPath, 'src'), input)
      if (found) {
        targetPath = found
        fileContent = fs.readFileSync(found, 'utf-8')
      }
    }
  }

  if (!fileContent) {
    // Jika masih kosong, treat sebagai potongan kode langsung
    fileContent = input
  }

  onChunk('◆ Membaca konteks project...\n\n')

  // 2. Load project knowledge
  const knowledge = await learnFromProject(projectPath)

  // 3. System prompt
  const systemPrompt = `Kamu adalah senior developer yang menjelaskan kode.
  
Konteks project: ${JSON.stringify(knowledge)}

Jelaskan kode berikut dengan:
1. Apa yang dilakukan kode ini secara keseluruhan (1-2 kalimat)
2. Bagian-bagian penting dan fungsinya
3. Pattern atau konsep yang digunakan
4. Hal yang perlu diperhatikan atau potensi masalah

Gunakan bahasa yang jelas. Jika ada istilah teknis, jelaskan singkat.`

  const userMessage = targetPath 
    ? `Jelaskan isi dari file ${targetPath}:\n\n${fileContent}` 
    : `Jelaskan potongan kode berikut:\n\n${fileContent}`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
  ]

  // 4. Kirim ke provider
  const response = await sendWithFallback({ messages })

  // 5. Stream response
  // Saat ini sendWithFallback mengembalikan satu string utuh.
  // Untuk mensimulasikan streaming ke console/ink, kita split per kata.
  const chunks = response.content.match(/\S+|\s+/g) || []
  for (const chunk of chunks) {
    onChunk(chunk)
    // Delay sedikit untuk memberi efek streaming
    await new Promise(r => setTimeout(r, 20))
  }
}

function findFileRecursively(dir: string, filename: string): string | null {
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findFileRecursively(fullPath, filename)
      if (found) return found
    } else if (file === filename || file.endsWith('/' + filename)) {
      return fullPath
    }
  }
  return null
}
