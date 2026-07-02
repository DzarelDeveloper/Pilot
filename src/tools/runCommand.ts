import { spawn } from 'node:child_process'

export interface RunCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCommand(command: string, cwd: string): Promise<RunCommandResult> {
  return new Promise((resolve) => {
    const parts = command.split(' ')
    const cmd = parts[0] ?? ''
    const args = parts.slice(1)

    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      stdout += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      stderr += text
      process.stderr.write(text)
    })

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      })
    })

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message,
      })
    })
  })
}
