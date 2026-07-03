#!/usr/bin/env node
import chalk from 'chalk'
import { detectIntent } from '../utils/detectIntent.js'

const args = process.argv.slice(2)

if (args.length === 0) {
  // ─── Interactive mode: unified onboarding + REPL ──────────────────────
  const { render } = await import('ink')
  const { PilotApp } = await import('./app.js')
  render(<PilotApp />)
} else {
  const command = args[0]
  
  if (command === 'plugin') {
    const { runPlugin } = await import('./commands/plugin.js')
    await runPlugin(args.slice(1))
    process.exit(0)
  } else {
    // Check if it's a plugin command
    const { loadPlugins, getCommandPlugins } = await import('../plugins/manager.js')
    await loadPlugins()
    const cmdPlugins = getCommandPlugins()
    const pluginCmd = cmdPlugins.find(p => p.manifest.commandName === command)

    if (pluginCmd && pluginCmd.module.run) {
      await pluginCmd.module.run(args.slice(1))
      process.exit(0)
    }

    // ─── One-shot mode: process and exit ──────────────────────────────────
    const prompt = args.join(' ')
    
    // eslint-disable-next-line no-console
    console.log(chalk.cyan('◆ Pilot') + chalk.dim(' v0.2.0'))
    // eslint-disable-next-line no-console
    console.log(chalk.dim('─'.repeat(40)))
    
    const intent = detectIntent(prompt)

    if (intent === 'code') {
      const { render } = await import('ink')
      const { OneShotAgent } = await import('./ui/OneShotAgent.js')
      render(<OneShotAgent prompt={prompt} projectPath={process.cwd()} />)
    } else {
      // one-shot CHAT: direct fallback, no react
      const { sendWithFallback } = await import('../router/fallback.js')
      const { getOrCreateSession, appendMessage, buildContext } = await import('../memory/index.js')
      
      try {
        const projectPath = process.cwd()
        const session = getOrCreateSession(projectPath)
        
        appendMessage(session, {
          role: 'user',
          content: prompt,
          timestamp: new Date().toISOString(),
        })
        
        const messages = buildContext(projectPath)
        const result = await sendWithFallback({ messages })
        
        appendMessage(session, {
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString(),
          provider: result.provider,
          model: result.model,
          tokensUsed: result.tokensUsed,
        })
        
        process.stdout.write(result.content + '\n')
        process.exit(0)
      } catch (err) {
        console.error(chalk.red('✗ Error: ') + (err instanceof Error ? err.message : String(err)))
        process.exit(1)
      }
    }
  }
}
