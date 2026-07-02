import type { PlanResult } from './types.js'
import { formatDuration } from '../utils/format.js'
import type { SummaryProps, FileAction } from '../cli/ui/Summary.js'

export function buildSummaryProps(
  plan: PlanResult,
  durationMs: number,
  provider: string,
  switchCount: number = 0,
): SummaryProps {
  const files: FileAction[] = []
  const commands: string[] = []

  for (const step of plan.steps) {
    if (step.action === 'run') {
      if (step.command) commands.push(step.command)
    } else {
      files.push({
        action: step.action === 'create' ? 'created' : step.action === 'edit' ? 'edited' : 'deleted',
        path: step.file,
        lines: step.estimatedLines,
      })
    }
  }

  // Suggestion based on what was done
  let suggestion = 'pilot chat'
  if (plan.steps.some(s => s.action === 'run' && s.command?.includes('install'))) {
    suggestion = 'pilot "jalankan aplikasi"'
  }

  return {
    title: plan.summary,
    files,
    commands,
    duration: formatDuration(durationMs),
    provider,
    switchCount,
    suggestion,
  }
}
