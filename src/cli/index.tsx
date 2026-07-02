#!/usr/bin/env node
import { render } from 'ink'
import { PilotApp } from './app.js'
import { runCode } from './commands/code.js'
import { runQuickChat } from './commands/quickchat.js'
import { detectIntent } from '../utils/detectIntent.js'

const args = process.argv.slice(2)

if (args.length === 0) {
  // ─── Interactive mode: unified onboarding + REPL ──────────────────────
  render(<PilotApp />)
} else {
  // ─── One-shot mode: process and exit ──────────────────────────────────
  const prompt = args.join(' ')
  const intent = detectIntent(prompt)

  if (intent === 'code') {
    runCode(prompt)
  } else {
    runQuickChat(prompt)
  }
}
