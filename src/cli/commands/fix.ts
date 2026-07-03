import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { sendWithFallback } from '../../router/fallback.js'
import type { Message } from '../../memory/types.js'

function detectStack(dir: string): string {
  const stack = []
  if (fs.existsSync(path.join(dir, 'package.json'))) stack.push('Node.js / npm')
  if (fs.existsSync(path.join(dir, 'requirements.txt'))) stack.push('Python')
  if (fs.existsSync(path.join(dir, 'go.mod'))) stack.push('Go')
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) stack.push('Rust')
  if (fs.existsSync(path.join(dir, 'pom.xml'))) stack.push('Java (Maven)')
  
  return stack.length > 0 ? stack.join(', ') : 'Unknown'
}

export async function runFix(args: string[]) {
  if (args.length === 0) {
    console.error(chalk.red('✗ Error: ') + 'Silakan berikan pesan error.')
    console.log(chalk.gray('Contoh: pilot fix "Cannot find module \'chalk\'" [--file src/index.js] [--apply]'))
    return
  }

  // Parse arguments
  let errorMessage = ''
  let filePath = ''
  let apply = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--file' && i + 1 < args.length) {
      filePath = args[i + 1]
      i++
    } else if (arg === '--apply') {
      apply = true
    } else if (!arg.startsWith('--')) {
      errorMessage += (errorMessage ? ' ' : '') + arg
    }
  }

  if (!errorMessage) {
    console.error(chalk.red('✗ Error: ') + 'Pesan error tidak boleh kosong.')
    return
  }

  let fileContent = ''
  if (filePath) {
    const absolutePath = path.resolve(process.cwd(), filePath)
    if (fs.existsSync(absolutePath)) {
      fileContent = fs.readFileSync(absolutePath, 'utf-8')
    } else {
      console.log(chalk.yellow(`⚠ Warning: File context tidak ditemukan: ${filePath}`))
    }
  }

  const stack = detectStack(process.cwd())
  console.log(chalk.cyan('◆ Pilot Fix'))
  console.log(chalk.dim('─'.repeat(40)))
  console.log(chalk.gray(`Mendiagnosis error... (Stack: ${stack})`))

  const systemPrompt = `Kamu adalah Pilot, asisten AI untuk developer.
Tugas kamu adalah mendiagnosis pesan error dari user dan memberikan saran perbaikan (step-by-step atau code snippet).
- Jika error terkait dependency, sarankan command install/upgrade yang sesuai.
- Berikan output dalam format markdown yang rapi.
- Tech Stack yang terdeteksi: ${stack}`

  let userContent = `Pesan Error:\n\`\`\`\n${errorMessage}\n\`\`\``
  if (fileContent) {
    userContent += `\n\nKonteks File (${filePath}):\n\`\`\`\n${fileContent.substring(0, 8000)}\n\`\`\``
  }

  const messages: Message[] = [
    { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
    { role: 'user', content: userContent, timestamp: new Date().toISOString() }
  ]

  try {
    const response = await sendWithFallback({ messages, temperature: 0.2 })
    console.log('\n' + response.content + '\n')
    
    if (apply) {
      console.log(chalk.dim('─'.repeat(40)))
      console.log(chalk.yellow('⚠ Mode --apply (Stub/MVP)'))
      console.log(chalk.gray('Pilot seharusnya mencoba menerapkan perbaikan ini secara otomatis ke dalam file.'))
      console.log(chalk.gray('Fitur auto-fix ini akan diimplementasikan penuh pada iterasi v0.4.0.'))
    }

    console.log(chalk.dim('─'.repeat(40)))
    console.log(chalk.gray(`Dijawab oleh: ${response.provider} (${response.model})`))
  } catch (error) {
    console.error(chalk.red('\n✗ Error saat menghubungi AI: ') + (error instanceof Error ? error.message : String(error)))
  }
}
