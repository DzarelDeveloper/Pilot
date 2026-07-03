import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import readline from 'node:readline'
import { sendWithFallback } from '../../router/fallback.js'
import type { Message } from '../../memory/types.js'

const MAX_FILE_SIZE = 30000 // roughly 7.5k tokens

export async function runExplain(args: string[]) {
  if (args.length === 0 || args[0].startsWith('--')) {
    console.error(chalk.red('✗ Error: ') + 'Silakan berikan path file yang ingin dijelaskan.')
    console.log(chalk.gray('Contoh: pilot explain src/utils/parser.js [--lang id|en] [--lines 10-50] [--deep]'))
    return
  }

  const filePath = args[0]
  const absolutePath = path.resolve(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(chalk.red('✗ Error: ') + `File tidak ditemukan: ${filePath}`)
    return
  }

  const stat = fs.statSync(absolutePath)
  if (stat.isDirectory()) {
    console.error(chalk.red('✗ Error: ') + `Path adalah direktori, bukan file: ${filePath}`)
    return
  }

  // Parse arguments
  let lang = 'id'
  let lines: [number, number] | null = null
  let deep = false

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--lang' && i + 1 < args.length) {
      lang = args[i + 1]
      i++
    } else if (arg === '--lines' && i + 1 < args.length) {
      const parts = args[i + 1].split('-')
      if (parts.length === 2) {
        lines = [parseInt(parts[0], 10), parseInt(parts[1], 10)]
      }
      i++
    } else if (arg === '--deep') {
      deep = true
    }
  }

  let fileContent = fs.readFileSync(absolutePath, 'utf-8')
  
  if (lines) {
    const fileLines = fileContent.split('\n')
    const start = Math.max(1, lines[0])
    const end = Math.min(fileLines.length, lines[1])
    fileContent = fileLines.slice(start - 1, end).join('\n')
    console.log(chalk.cyan('◆ Pilot Explain ') + chalk.dim(`(Baris ${start}-${end})`))
  } else {
    console.log(chalk.cyan('◆ Pilot Explain'))
  }

  console.log(chalk.dim('─'.repeat(40)))
  console.log(chalk.gray(`Menganalisis file: ${filePath}...`))

  if (fileContent.length > MAX_FILE_SIZE) {
    console.log(chalk.yellow(`⚠ Warning: File terlalu besar (${Math.round(fileContent.length / 1024)}KB).`))
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise<string>(resolve => {
      rl.question('Lanjutkan dengan file yang dipotong (chunk)? (y/N) ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.gray('Dibatalkan.'))
      return
    }
    
    fileContent = fileContent.substring(0, MAX_FILE_SIZE)
    console.log(chalk.gray('File dipotong untuk menyesuaikan limit token.'))
  }

  const langInstruction = lang === 'en' ? 'English' : 'Indonesian'
  const deepInstruction = deep ? '\nLakukan analisis mendalam (deep analysis), temukan potensi bug, code smell, dan masalah performa.' : ''

  const systemPrompt = `Kamu adalah Pilot, asisten AI untuk developer.
Tugas kamu adalah menjelaskan kode yang diberikan oleh user.
Berikan:
1. Ringkasan fungsi utama.
2. Alur logika secara singkat.
${deepInstruction}

Gunakan bahasa: ${langInstruction}.
Format output menggunakan markdown. Jangan memberikan penjelasan yang terlalu panjang kecuali diminta.`

  const messages: Message[] = [
    { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
    { role: 'user', content: `Bantu jelaskan kode ini:\n\n\`\`\`\n${fileContent}\n\`\`\``, timestamp: new Date().toISOString() }
  ]

  try {
    const response = await sendWithFallback({ messages, temperature: 0.2 })
    console.log('\n' + response.content + '\n')
    console.log(chalk.dim('─'.repeat(40)))
    console.log(chalk.gray(`Dijawab oleh: ${response.provider} (${response.model})`))
  } catch (error) {
    console.error(chalk.red('\n✗ Error saat menghubungi AI: ') + (error instanceof Error ? error.message : String(error)))
  }
}
