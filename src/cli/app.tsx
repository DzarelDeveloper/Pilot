import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, Text, useInput, useApp, useStdout } from 'ink'
import { TextInput, PasswordInput } from '@inkjs/ui'
import InkSpinner from 'ink-spinner'
import { exec, spawn } from 'child_process'
import { getConfig, saveConfig, isProviderConfigured } from '../config/index.js'
import { Banner } from './ui/Banner.js'
import { detectOllama, RECOMMENDED_MODELS } from '../router/providers/ollama.js'
import { getResolvedProviders } from '../router/providers/index.js'
import { sendWithFallback, getLastSwitch, clearLastSwitch } from '../router/fallback.js'
import { getOrCreateSession, appendMessage, buildContext } from '../memory/index.js'
import { detectIntent } from '../utils/detectIntent.js'
import { CodeApp } from './commands/code.js'
import { GoodbyeScreen } from './ui/GoodbyeScreen.js'
import type { PilotConfig, ProvidersConfig } from '../config/types.js'
import type { Message } from '../memory/types.js'
import type { ProviderConfig, OllamaStatus } from '../router/providers/types.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppPhase =
  | 'check-config'
  | 'setup-cloud'
  | 'setup-ollama'
  | 'setup-summary'
  | 'repl'
  | 'repl-status'
  | 'repl-help'
  | 'repl-processing'
  | 'coding'
  | 'goodbye'

type OllamaSubState = 
  | 'checking'
  | 'installed'
  | 'not-installed'
  | 'installing'
  | 'select-download'
  | 'pulling'

interface ChatEntry {
  role: 'user' | 'assistant' | 'system' | 'info'
  content: string
  provider?: string
}

interface CloudProviderInfo {
  name: string
  configKey: keyof ProvidersConfig
  displayName: string
  keyUrl: string
  recommended?: string
  needsAccountId?: boolean
}

const CLOUD_PROVIDERS: CloudProviderInfo[] = [
  { name: 'gemini', configKey: 'gemini', displayName: 'Gemini', keyUrl: 'https://aistudio.google.com/apikey', recommended: 'RECOMMENDED — 1500 req/hari' },
  { name: 'qwen', configKey: 'qwen', displayName: 'Qwen', keyUrl: 'https://dashscope.console.aliyun.com' },
  { name: 'nvidia-nim', configKey: 'nvidiaNim', displayName: 'NVIDIA NIM', keyUrl: 'https://build.nvidia.com' },
  { name: 'openrouter', configKey: 'openrouter', displayName: 'OpenRouter', keyUrl: 'https://openrouter.ai/keys' },
  { name: 'cloudflare', configKey: 'cloudflare', displayName: 'Cloudflare AI', keyUrl: 'https://dash.cloudflare.com', needsAccountId: true },
  { name: 'kiro', configKey: 'kiro', displayName: 'Kiro AI', keyUrl: 'https://kiro.ai' },
  { name: 'iflow', configKey: 'iflow', displayName: 'iFlow', keyUrl: 'https://iflow.ai' },
  { name: 'opencode', configKey: 'opencode', displayName: 'OpenCode', keyUrl: 'https://opencode.ai' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SelectItem {
  label: string
  value: string
  desc?: string
}

function CustomSelect({ items, onSelect }: { items: SelectItem[], onSelect: (val: string) => void }) {
  const [cursor, setCursor] = useState(0)

  useInput((_input, key) => {
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1))
    }
    if (key.downArrow) {
      setCursor(c => Math.min(items.length - 1, c + 1))
    }
    if (key.return) {
      onSelect(items[cursor].value)
    }
  })

  return (
    <Box flexDirection="column" marginTop={1}>
      {items.map((item, i) => {
        const isActive = i === cursor
        return (
          <Box key={item.value}>
            {isActive ? (
              <>
                <Text color="cyan">❯ </Text>
                <Text color="white" bold>{item.label.padEnd(16)}</Text>
              </>
            ) : (
              <>
                <Text dimColor>  </Text>
                <Text dimColor>{item.label.padEnd(16)}</Text>
              </>
            )}
            {item.desc && (
              <Text dimColor>  {item.desc}</Text>
            )}
          </Box>
        )
      })}
    </Box>
  )
}


// ─── Main App ─────────────────────────────────────────────────────────────────

export function PilotApp(): React.ReactElement {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24)
  const [terminalWidth, setTerminalWidth] = useState(stdout.columns || 80)

  useEffect(() => {
    const onResize = () => {
      setTerminalHeight(stdout.rows || 24)
      setTerminalWidth(stdout.columns || 80)
    }
    stdout.on('resize', onResize)
    return () => {
      stdout.removeListener('resize', onResize)
    }
  }, [stdout])

  // Core state
  const [phase, setPhase] = useState<AppPhase>('check-config')
  const [chatLog, setChatLog] = useState<ChatEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [switchNotice, setSwitchNotice] = useState<string | null>(null)
  const [activePrompt, setActivePrompt] = useState('')

  // Session stats (for goodbye screen)
  const [sessionStartTime] = useState<number>(Date.now())
  const [requestCount, setRequestCount] = useState(0)
  const [usedProviderNames, setUsedProviderNames] = useState<string[]>([])

  // Setup state
  const [currentProviderIdx, setCurrentProviderIdx] = useState(0)
  const [waitingForAccountId, setWaitingForAccountId] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const [configuredNames, setConfiguredNames] = useState<string[]>([])

  // Ollama state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [ollamaSubState, setOllamaSubState] = useState<OllamaSubState>('checking')
  const [installLog, setInstallLog] = useState<string[]>([])
  const [pullProgress, setPullProgress] = useState<{ pct: number; size: string; status: string } | null>(null)
  const [pullError, setPullError] = useState<string | null>(null)
  const [selectedModelToPull, setSelectedModelToPull] = useState<string | null>(null)

  // Provider status (for /status)
  const resolvedProviders = useMemo<ProviderConfig[]>(() => getResolvedProviders(), [configuredNames, tempApiKey])

  // REPL input key (to clear input)
  const [inputKey, setInputKey] = useState(0)

  // Active provider (for status bar)
  const config = getConfig()
  const activeCloud = resolvedProviders.find(p => p.status === 'active')?.displayName
  const activeProviderName = activeCloud || (ollamaStatus?.available ? 'Ollama' : 'None')

  // ─── TAHAP 1→2 transition (Check config immediately) ──────────────────────
  useEffect(() => {
    if (phase === 'check-config') {
      const hasAnyProvider = CLOUD_PROVIDERS.some((cp) => isProviderConfigured(cp.name))
      const ollamaConfigured = config.providers.ollama?.enabled !== false

      if (hasAnyProvider || ollamaConfigured) {
        if (hasAnyProvider) {
          setPhase('repl')
        } else {
          detectOllama().then((status) => {
            setOllamaStatus(status)
            if (status.available) {
              setPhase('repl')
            } else {
              setPhase('setup-cloud')
            }
          })
        }
      } else {
        setPhase('setup-cloud')
      }
    }
  }, [phase, config.providers.ollama?.enabled])

  // ─── Setup Ollama Logic ───────────────────────────────────────────────────

  const checkOllama = useCallback(async (isRetry = false) => {
    setOllamaSubState('checking')
    const status = await detectOllama()
    setOllamaStatus(status)
    if (status.available) {
      if (!status.models || status.models.length === 0) {
        setOllamaSubState('select-download')
      } else {
        setOllamaSubState('installed')
      }
    } else {
      if (isRetry) {
        setOllamaSubState('not-installed')
        setInstallLog(prev => [...prev, "✗ Ollama belum berjalan atau instalasi gagal."])
      } else {
        setOllamaSubState('not-installed')
      }
    }
  }, [])

  const startOllamaInstall = useCallback(() => {
    setOllamaSubState('installing')
    setInstallLog(['Starting installation...'])
    const child = exec('curl -fsSL https://ollama.com/install.sh | sh')
    
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        setInstallLog((prev) => [...prev, ...data.toString().split('\n').filter(Boolean)].slice(-10))
      })
    }
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        setInstallLog((prev) => [...prev, ...data.toString().split('\n').filter(Boolean)].slice(-10))
      })
    }
    child.on('close', (code) => {
      setInstallLog((prev) => [...prev, `Process exited with code ${code}. Tekan Enter untuk verifikasi.`])
    })
  }, [])

  const selectOllamaModel = useCallback((model: string) => {
    const config = getConfig()
    const newConfig: PilotConfig = {
      ...config,
      providers: {
        ...config.providers,
        ollama: { enabled: true, model: model, baseUrl: "http://localhost:11434/v1" }
      }
    }
    saveConfig(newConfig)
    setPhase('setup-summary')
  }, [])

  const pullOllamaModel = useCallback((modelName: string) => {
    setOllamaSubState('pulling')
    setPullProgress({ pct: 0, size: '0GB / 0GB', status: `Pulling ${modelName}...` })
    setPullError(null)

    const child = spawn('ollama', ['pull', modelName])
    
    let lastSize = '0GB / 0GB'
    
    child.stdout.on('data', (data) => {
      const str = data.toString()
      let newPct = 0
      
      const pctMatch = str.match(/(\d+)%/)
      if (pctMatch) newPct = parseInt(pctMatch[1])
      
      const sizeMatch = str.match(/(\d+(\.\d+)?[A-Z]+)\s*\/\s*(\d+(\.\d+)?[A-Z]+)/)
      if (sizeMatch) {
         lastSize = sizeMatch[0]
      }
      
      setPullProgress(prev => ({
        pct: newPct > 0 ? newPct : (prev?.pct || 0),
        size: lastSize,
        status: str.split('\n')[0] || `Downloading ${modelName}...`
      }))
    })

    child.stderr.on('data', (data) => {
      // Sometimes ollama prints to stderr for errors
      setPullError(data.toString())
    })

    child.on('close', (code) => {
      if (code === 0) {
        setPullProgress({ pct: 100, size: lastSize, status: 'Completed!' })
        // Delay slighty so user sees 100%
        setTimeout(() => {
          selectOllamaModel(modelName)
        }, 1500)
      } else {
        setPullError(`Gagal pull model (exit ${code}). Silakan coba lagi.`)
      }
    })
  }, [selectOllamaModel])

  useEffect(() => {
    if ((ollamaSubState === 'installed' || ollamaSubState === 'select-download') && selectedModelToPull) {
      const model = selectedModelToPull
      setSelectedModelToPull(null)
      pullOllamaModel(model)
    }
  }, [ollamaSubState, selectedModelToPull, pullOllamaModel])

  // Custom key handler for when we're in specific setup phases that don't have TextInput
  useInput((_input, key) => {
    if (phase === 'setup-ollama') {
      if (ollamaSubState === 'installing' && key.return) {
        checkOllama(true)
      }
      if (ollamaSubState === 'pulling' && pullError && key.return) {
         setOllamaSubState('select-download') // let them retry
      }
    }
    if (phase === 'repl-status' || phase === 'repl-help') {
      setPhase('repl')
    }
  })

  // ─── Regular Handlers ─────────────────────────────────────────────────────

  const handleCloudKeySubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      const provider = CLOUD_PROVIDERS[currentProviderIdx]

      if (!provider) return

      if (provider.needsAccountId && waitingForAccountId) {
        if (!trimmed) {
          setWaitingForAccountId(false)
          setTempApiKey('')
          if (currentProviderIdx < CLOUD_PROVIDERS.length - 1) {
            setCurrentProviderIdx((i) => i + 1)
          } else {
            checkOllama()
            setPhase('setup-ollama')
          }
          setInputKey((k) => k + 1)
          return
        }

        const currentConfig = getConfig()
        const newConfig: PilotConfig = {
          ...currentConfig,
          providers: { 
            ...currentConfig.providers,
            [provider.configKey]: { apiKey: tempApiKey, accountId: trimmed } 
          },
        }
        saveConfig(newConfig)
        setConfiguredNames((prev) => [...prev, provider.displayName])
        
        setTempApiKey('')
        setWaitingForAccountId(false)
        if (currentProviderIdx < CLOUD_PROVIDERS.length - 1) {
          setCurrentProviderIdx((i) => i + 1)
        } else {
          checkOllama()
          setPhase('setup-ollama')
        }
        setInputKey((k) => k + 1)
        return
      }

      if (!trimmed) {
        if (currentProviderIdx < CLOUD_PROVIDERS.length - 1) {
          setCurrentProviderIdx((i) => i + 1)
        } else {
          checkOllama()
          setPhase('setup-ollama')
        }
        setInputKey((k) => k + 1)
        return
      }

      if (provider.needsAccountId) {
        setTempApiKey(trimmed)
        setWaitingForAccountId(true)
        setInputKey((k) => k + 1)
        return
      }

      const currentConfig = getConfig()
      const newConfig: PilotConfig = {
        ...currentConfig,
        providers: { 
          ...currentConfig.providers,
          [provider.configKey]: { apiKey: trimmed } 
        },
      }
      saveConfig(newConfig)
      setConfiguredNames((prev) => [...prev, provider.displayName])

      if (currentProviderIdx < CLOUD_PROVIDERS.length - 1) {
        setCurrentProviderIdx((i) => i + 1)
      } else {
        checkOllama()
        setPhase('setup-ollama')
      }
      setInputKey((k) => k + 1)
    },
    [currentProviderIdx, waitingForAccountId, tempApiKey, checkOllama],
  )

  const handleReplSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      setInputKey((k) => k + 1)

      if (!trimmed) return

      if (trimmed === '/exit' || trimmed === '/quit') {
        setPhase('goodbye')
        return
      }

      if (trimmed === '/status') {
        setPhase('repl-status')
        return
      }

      if (trimmed === '/help') {
        setPhase('repl-help')
        return
      }

      if (trimmed === '/new') {
        setChatLog([{ role: 'info', content: '◆ Session baru dimulai.' }])
        return
      }

      if (trimmed === '/setup') {
        setCurrentProviderIdx(0)
        setConfiguredNames([])
        setWaitingForAccountId(false)
        setTempApiKey('')
        setPhase('setup-cloud')
        return
      }

      const intent = detectIntent(trimmed)

      if (intent === 'code') {
        setChatLog((prev) => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'info', content: 'Memulai vibe coding agent...' },
        ])
        setActivePrompt(trimmed)
        setPhase('coding')
        return
      }

      // Chat mode
      setChatLog((prev) => [...prev, { role: 'user', content: trimmed }])
      setIsProcessing(true)

      const projectPath = process.cwd()
      const session = getOrCreateSession(projectPath)
      const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date().toISOString() }
      appendMessage(session, userMsg)

      const messages = buildContext(projectPath)

      sendWithFallback({ messages })
        .then((result) => {
          const assistantMsg: Message = {
            role: 'assistant',
            content: result.content,
            timestamp: new Date().toISOString(),
            provider: result.provider,
            model: result.model,
            tokensUsed: result.tokensUsed,
          }
          appendMessage(session, assistantMsg)

          const switchInfo = getLastSwitch()
          if (switchInfo) {
            setSwitchNotice(`${switchInfo.from} → ${switchInfo.to} (auto-switch)`)
            clearLastSwitch()
            setTimeout(() => setSwitchNotice(null), 2000)
          }

          setChatLog((prev) => [
            ...prev,
            { role: 'assistant', content: result.content, provider: result.provider },
          ])
          setRequestCount((c) => c + 1)
          if (result.provider && !usedProviderNames.includes(result.provider)) {
            setUsedProviderNames((prev) => [...prev, result.provider!])
          }
          setIsProcessing(false)
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          setChatLog((prev) => [
            ...prev,
            { role: 'info', content: `Error: ${msg}` },
          ])
          setIsProcessing(false)
        })
    },
    [exit],
  )

  useEffect(() => {
    if (phase === 'setup-summary') {
      const timer = setTimeout(() => {
        setPhase('repl')
      }, 2500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [phase])

  // ─── Middle Content Renderers ─────────────────────────────────────────────

  let middleContent: React.ReactNode = null
  let inputContent: React.ReactNode = null

  if (phase === 'setup-cloud') {
    const provider = CLOUD_PROVIDERS[currentProviderIdx]
    if (provider) {
      middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="cyan" bold>◆ Setup Provider</Text>
          <Text color="gray">Semakin banyak provider = semakin luas limit gratis kamu.</Text>
          <Text> </Text>
          <Box>
            <Text color="white" bold>
              [{currentProviderIdx + 1}/{CLOUD_PROVIDERS.length}] {provider.displayName}
            </Text>
            {provider.recommended && <Text color="green"> ({provider.recommended})</Text>}
          </Box>
          <Text color="dim">  {provider.keyUrl}</Text>
          
          {configuredNames.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {configuredNames.map((name, i) => (
                <Text key={i} color="green">✓ {name}</Text>
              ))}
            </Box>
          )}
        </Box>
      )

      inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="cyan">
            {waitingForAccountId ? 'Account ID: ' : 'Paste key (Enter skip): '}
          </Text>
          {waitingForAccountId ? (
            <TextInput key={inputKey} onSubmit={handleCloudKeySubmit} placeholder="" />
          ) : (
            <PasswordInput key={inputKey} onSubmit={handleCloudKeySubmit} placeholder="" />
          )}
        </Box>
      )
    }
  } else if (phase === 'setup-ollama') {
    if (ollamaSubState === 'checking') {
      middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="cyan" bold>◆ Setup Ollama</Text>
          <Text color="gray">Mengecek Ollama di background...</Text>
        </Box>
      )
      inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="cyan"><InkSpinner type="dots" /></Text>
          <Text color="gray"> Checking...</Text>
        </Box>
      )
    } else if (ollamaSubState === 'installed') {
      const items: SelectItem[] = (ollamaStatus?.models || []).map(m => ({ label: m, value: m, desc: '(sudah terinstall)' }))
      items.push({ label: '+ Download model lain', value: '__download__', desc: '(pull model baru dari internet)' })
      
      middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="green" bold>✓ Ollama terdeteksi di localhost:11434</Text>
          <Text color="dim">  Model tersedia: {ollamaStatus?.models?.join(', ') ?? 'kosong'}</Text>
          <Text> </Text>
          <Text color="white" bold>Pilih model default untuk Pilot:</Text>
          <CustomSelect items={items} onSelect={(val) => {
            if (val === '__download__') {
              setOllamaSubState('select-download')
            } else {
              selectOllamaModel(val)
            }
          }} />
        </Box>
      )
      inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="dim">Gunakan panah Atas/Bawah dan Enter untuk memilih.</Text>
        </Box>
      )
    } else if (ollamaSubState === 'not-installed') {
      const items = RECOMMENDED_MODELS.map((m, i) => ({
        label: `${i + 1}. ${m.name.padEnd(14)}`,
        value: m.name,
        desc: `(${m.size}) - ${m.desc}`
      }))
      items.push({ label: 'Lewati dulu', value: 'no', desc: '(bisa install nanti)' })

      middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="gray">○ Ollama tidak ditemukan</Text>
          <Text> </Text>
          <Text color="gray">Ollama = local AI gratis, unlimited, bisa offline.</Text>
          <Text color="gray">Tidak butuh API key. Jalan di komputer kamu sendiri.</Text>
          <Text> </Text>
          <Text color="cyan" bold>Pilih model yang ingin di-install beserta Ollama:</Text>
          <Text color="gray">(Disarankan no. 1 agar ringan)</Text>
          <CustomSelect 
            items={items} 
            onSelect={(val) => {
              if (val === 'no') {
                setPhase('setup-summary')
              } else {
                setSelectedModelToPull(val)
                startOllamaInstall()
              }
            }}
          />
        </Box>
      )
      inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="dim">Gunakan panah Atas/Bawah dan Enter untuk memilih.</Text>
        </Box>
      )
    } else if (ollamaSubState === 'installing') {
       middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="cyan" bold>Step 1 — Download & install Ollama:</Text>
          <Box borderStyle="round" borderColor="dim" paddingX={1} marginBottom={1}>
            <Text color="gray">curl -fsSL https://ollama.com/install.sh | sh</Text>
          </Box>
          <Text color="dim">Terminal Output:</Text>
          <Box flexDirection="column" marginLeft={2}>
             {installLog.map((log, i) => <Text key={i} color="dim">{log}</Text>)}
          </Box>
        </Box>
       )
       inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="white" bold>Sudah install? Tekan Enter untuk cek ulang.</Text>
        </Box>
       )
    } else if (ollamaSubState === 'select-download') {
       const items = RECOMMENDED_MODELS.map(m => ({
          label: m.name,
          value: m.name,
          desc: `${m.size.padEnd(6)} · ${m.desc}`
       }))
       middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="cyan" bold>Step 2 — Pilih model untuk di-download:</Text>
          <CustomSelect items={items} onSelect={pullOllamaModel} />
        </Box>
       )
       inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="dim">Gunakan panah Atas/Bawah dan Enter untuk memilih.</Text>
        </Box>
       )
    } else if (ollamaSubState === 'pulling') {
       const pct = pullProgress?.pct || 0
       const barWidth = 20
       const filled = Math.round((pct / 100) * barWidth)
       const empty = barWidth - filled
       const bar = '█'.repeat(filled) + '░'.repeat(empty)

       middleContent = (
        <Box flexDirection="column">
          <Banner columns={terminalWidth} />
          <Text color="white" bold>Downloading {pullProgress?.status || 'model'}...</Text>
          <Box marginTop={1}>
            <Text color="cyan">{bar}  {pct}%  </Text>
            <Text color="dim">{pullProgress?.size}</Text>
          </Box>
          {pullError && (
             <Box marginTop={1} flexDirection="column">
               <Text color="red">✗ {pullError}</Text>
             </Box>
          )}
        </Box>
       )
       inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          {pullError ? (
            <Text color="white">Tekan Enter untuk kembali ke pemilihan model.</Text>
          ) : (
            <>
              <Text color="cyan"><InkSpinner type="dots" /></Text>
              <Text color="gray"> Harap tunggu hingga selesai...</Text>
            </>
          )}
        </Box>
       )
    }
  } else if (phase === 'setup-summary') {
    const allConfigured = CLOUD_PROVIDERS.filter((cp) => isProviderConfigured(cp.name))
    middleContent = (
      <Box flexDirection="column">
          <Banner columns={terminalWidth} />
        <Text color="cyan" bold>◆ Setup selesai!</Text>
        <Text> </Text>
        <Text color="white">Provider aktif:</Text>
        {allConfigured.map((cp) => (
          <Text key={cp.name} color="green">✓ {cp.displayName}</Text>
        ))}
        {allConfigured.length === 0 && (
          <Text color="yellow">(belum ada cloud provider)</Text>
        )}
        {ollamaStatus?.available || getConfig().providers.ollama?.enabled ? (
          <Text color="green">✓ Ollama (local)</Text>
        ) : (
          <Text color="dim">○ Ollama (belum di-setup)</Text>
        )}
      </Box>
    )
    inputContent = (
      <Box>
        <Text color="cyan" bold>{"> "}</Text>
        <Text color="gray">Menyiapkan workspace...</Text>
      </Box>
    )
  } else if (phase === 'repl-status') {
    const cloud = resolvedProviders.filter((p) => !p.isLocal)
    middleContent = (
      <Box flexDirection="column">
        <Text color="cyan" bold>◆ Provider Status</Text>
        <Text color="dim">{'─'.repeat(40)}</Text>
        {cloud.map((p) => {
          let statusText = 'belum setup'
          let color = 'dim'
          if (p.status === 'active') { statusText = 'aktif'; color = 'green' }
          if (p.status === 'rate-limited') { statusText = 'rate-limit'; color = 'red' }
          
          return (
            <Box key={p.name}>
              <Text color={color}>{p.status === 'active' ? '✓' : '○'} {p.displayName.padEnd(16)} {statusText}</Text>
            </Box>
          )
        })}
        <Text color="dim">{'─'.repeat(40)}</Text>
        {ollamaStatus?.available ? (
          <Text color="green">✓ Ollama          aktif (lokal)</Text>
        ) : (
          <Text color="dim">○ Ollama          tidak terdeteksi</Text>
        )}
      </Box>
    )
    inputContent = (
      <Box>
        <Text color="cyan" bold>{"> "}</Text>
        <Text color="dim">Tekan tombol apapun untuk kembali...</Text>
      </Box>
    )
  } else if (phase === 'repl-help') {
    middleContent = (
      <Box flexDirection="column">
        <Text color="cyan" bold>◆ Help — Slash Commands</Text>
        <Text color="dim">{'─'.repeat(40)}</Text>
        <Text color="cyan">/status  <Text color="dim">Status semua provider</Text></Text>
        <Text color="cyan">/setup   <Text color="dim">Setup / tambah API key baru</Text></Text>
        <Text color="cyan">/new     <Text color="dim">Mulai session baru</Text></Text>
        <Text color="cyan">/help    <Text color="dim">Tampilkan bantuan ini</Text></Text>
        <Text color="cyan">/exit    <Text color="dim">Keluar dari Pilot</Text></Text>
      </Box>
    )
    inputContent = (
      <Box>
        <Text color="cyan" bold>{"> "}</Text>
        <Text color="dim">Tekan tombol apapun untuk kembali...</Text>
      </Box>
    )
  } else if (phase === 'repl' || phase === 'repl-processing') {
    const visibleLog = chatLog.slice(-20) // Show up to 20 messages
    middleContent = (
      <Box flexDirection="column" justifyContent="flex-end" flexGrow={1}>
        <Banner columns={terminalWidth} />
        {visibleLog.map((entry, i) => {
          if (entry.role === 'user') {
            return (
              <Box key={i} marginTop={i === 0 ? 0 : 1}>
                <Text color="white" bold>You: </Text>
                <Text color="white">{entry.content}</Text>
              </Box>
            )
          }
          if (entry.role === 'assistant') {
            return (
              <Box key={i} flexDirection="column" marginTop={1}>
                <Text color="cyan" bold>Pilot: </Text>
                <Text color="white">{entry.content}</Text>
              </Box>
            )
          }
          // info
          return (
            <Box key={i} marginTop={1}>
              <Text color="dim">{entry.content}</Text>
            </Box>
          )
        })}
      </Box>
    )

    if (isProcessing) {
      inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <Text color="cyan"><InkSpinner type="dots" /></Text>
          <Text color="white"> Generating...</Text>
        </Box>
      )
    } else {
      inputContent = (
        <Box>
          <Text color="cyan" bold>{"> "}</Text>
          <TextInput
            key={inputKey}
            onSubmit={handleReplSubmit}
            placeholder="Type your message or /help..."
          />
        </Box>
      )
    }
  } else if (phase === 'coding') {
    middleContent = (
      <Box flexDirection="column" flexGrow={1}>
        <Banner columns={terminalWidth} />
        <CodeApp 
          prompt={activePrompt} 
          projectPath={process.cwd()} 
          onDone={() => {
            setPhase('repl')
            setActivePrompt('')
          }} 
        />
      </Box>
    )
    inputContent = null
  }

  // ─── Layout Structure ─────────────────────────────────────────────────────

  // Goodbye phase — exit after delay
  useEffect(() => {
    if (phase === 'goodbye') {
      const timer = setTimeout(() => process.exit(0), 1500)
      return () => clearTimeout(timer)
    }
  }, [phase])

  if (phase === 'check-config') {
    return <Text color="dim">Loading...</Text>
  }

  if (phase === 'goodbye') {
    return (
      <GoodbyeScreen
        requestCount={requestCount}
        activeProviders={usedProviderNames.length > 0 ? usedProviderNames : [activeProviderName]}
        sessionDuration={Date.now() - sessionStartTime}
      />
    )
  }

  return (
    <Box flexDirection="column" minHeight={terminalHeight}>
      {/* Header (REPL only, Banner is shown in middle content during setup) */}
      {(phase === 'repl' || phase === 'repl-processing' || phase === 'repl-status' || phase === 'repl-help') && (
        <Box justifyContent="space-between" marginBottom={1}>
          <Text color="cyan" bold>◆ Pilot  v0.1.0  · Ready</Text>
          <Text color="dim">{activeProviderName}</Text>
        </Box>
      )}

      {/* Middle Scrollable / Main Content Area */}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {middleContent}
      </Box>

      {/* Auto-switch Notification */}
      {switchNotice && (
        <Box marginTop={1}>
          <Text color="yellow">◆ {switchNotice}</Text>
        </Box>
      )}

      {/* Input Box (Bottom) */}
      <Box marginTop={1}>
        {inputContent}
      </Box>

      {/* Status Bar */}
      <Box marginTop={1}>
        <Text dimColor>
          {process.cwd()}    provider: {activeProviderName}    /model: auto
        </Text>
      </Box>
    </Box>
  )
}
