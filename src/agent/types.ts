export interface ThinkResult {
  understood: string
  needsClarification: boolean
  clarificationQuestion: string | null
  estimatedFiles: number
  readFiles: string[]
  techStack?: string
}

export interface PlanStep {
  id: number
  action: 'create' | 'edit' | 'delete' | 'run'
  file: string
  reason: string
  estimatedLines?: number
  command?: string // Untuk action "run"
}

export interface PlanResult {
  summary: string
  steps: PlanStep[]
  dependencies: string[]
  warnings: string[]
}
