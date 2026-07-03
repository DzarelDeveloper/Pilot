/* eslint-disable no-console */
import fs from 'node:fs'
import path from 'node:path'
import chalk from 'chalk'
import { getPluginsDir, loadPlugins } from '../../plugins/manager.js'

import type { PluginManifest } from '../../plugins/manager.js'

export async function runPlugin(args: string[]): Promise<void> {
  if (args.length === 0) {
    printHelp()
    return
  }

  const subCommand = args[0]
  
  if (subCommand === 'list') {
    await handleList()
  } else if (subCommand === 'add') {
    if (args.length < 2) {
      console.error(chalk.red('✗ Error: ') + 'Silakan berikan path lokal plugin yang akan diinstall.')
      return
    }
    await handleAdd(args[1])
  } else if (subCommand === 'remove') {
    if (args.length < 2) {
      console.error(chalk.red('✗ Error: ') + 'Silakan berikan nama plugin yang akan dihapus.')
      return
    }
    await handleRemove(args[1])
  } else {
    console.error(chalk.red('✗ Error: ') + `Subcommand tidak dikenal: ${subCommand}`)
    printHelp()
  }
}

function printHelp(): void {
  console.log(chalk.cyan('◆ Pilot Plugin System'))
  console.log(chalk.dim('─'.repeat(40)))
  console.log('Commands:')
  console.log(`  ${chalk.green('list')}                  Tampilkan semua plugin terpasang`)
  console.log(`  ${chalk.green('add')} <path/url>        Install plugin dari path lokal (MVP)`)
  console.log(`  ${chalk.green('remove')} <nama-plugin>  Hapus plugin terpasang`)
}

async function handleList(): Promise<void> {
  console.log(chalk.cyan('◆ Plugin Terpasang'))
  console.log(chalk.dim('─'.repeat(40)))
  
  const plugins = await loadPlugins()
  
  if (plugins.length === 0) {
    console.log(chalk.gray('Belum ada plugin yang terpasang.'))
    return
  }
  
  for (const p of plugins) {
    const typeLabel = p.manifest.type === 'provider' ? chalk.magenta('[Provider]') : chalk.blue('[Command]')
    console.log(`${chalk.bold(p.manifest.name)} ${chalk.dim(`v${p.manifest.version}`)} ${typeLabel}`)
    console.log(chalk.gray(`  Path: ${p.dirPath}`))
    if (p.manifest.type === 'command') {
      console.log(chalk.gray(`  Command: pilot ${p.manifest.commandName}`))
    }
  }
}

async function handleAdd(sourcePath: string): Promise<void> {
  const absoluteSource = path.resolve(process.cwd(), sourcePath)
  
  if (!fs.existsSync(absoluteSource)) {
    console.error(chalk.red('✗ Error: ') + `Path tidak ditemukan: ${absoluteSource}`)
    return
  }
  
  const manifestPath = path.join(absoluteSource, 'plugin.json')
  if (!fs.existsSync(manifestPath)) {
    console.error(chalk.red('✗ Error: ') + 'Bukan direktori plugin valid (plugin.json tidak ditemukan).')
    return
  }
  
  let manifestStr = ''
  let manifest: PluginManifest | null = null
  try {
    manifestStr = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(manifestStr) as PluginManifest
  } catch (err) {
    console.error(chalk.red('✗ Error: ') + 'Gagal membaca/parsing plugin.json')
    return
  }
  
  if (!manifest?.name) {
    console.error(chalk.red('✗ Error: ') + 'Plugin manifest harus memiliki properti "name".')
    return
  }
  
  const pluginsDir = getPluginsDir()
  const targetDir = path.join(pluginsDir, manifest.name)
  
  if (fs.existsSync(targetDir)) {
    console.log(chalk.yellow(`⚠ Plugin '${manifest?.name}' sudah terpasang. Menimpa ulang...`))
    fs.rmSync(targetDir, { recursive: true, force: true })
  }
  
  try {
    fs.cpSync(absoluteSource, targetDir, { recursive: true })
    console.log(chalk.green(`✓ Plugin '${manifest?.name}' berhasil di-install!`))
  } catch (err) {
    console.error(chalk.red('✗ Error: ') + 'Gagal meng-copy file plugin.')
  }
}

async function handleRemove(pluginName: string): Promise<void> {
  const pluginsDir = getPluginsDir()
  const targetDir = path.join(pluginsDir, pluginName)
  
  if (!fs.existsSync(targetDir)) {
    console.error(chalk.red('✗ Error: ') + `Plugin '${pluginName}' tidak ditemukan.`)
    return
  }
  
  try {
    fs.rmSync(targetDir, { recursive: true, force: true })
    console.log(chalk.green(`✓ Plugin '${pluginName}' berhasil dihapus.`))
  } catch (err) {
    console.error(chalk.red('✗ Error: ') + 'Gagal menghapus direktori plugin.')
  }
}
