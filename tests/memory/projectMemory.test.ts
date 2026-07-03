import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import { learnFromProject, updateAfterExecute } from '../../src/memory/projectMemory.js'

vi.mock('node:fs')
vi.mock('node:os')

describe('projectMemory', () => {
  const mockProjectDir = '/mock/project'
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(os.homedir).mockReturnValue('/mock/home')
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)
    vi.mocked(fs.readdirSync).mockReturnValue([])
  })
  
  it('learnFromProject() -> ProjectKnowledge tersimpan di disk', async () => {
    // Simulasikan file knowledge belum ada
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p.toString().includes('.json') && p.toString().includes('.pilot')) return false
      return true
    })
    
    // Simulate fs.statSync to prevent readdirSync from failing
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as any)
    vi.mocked(fs.readFileSync).mockReturnValue('{}') // dummy empty json for package.json
    
    const knowledge = await learnFromProject(mockProjectDir)
    
    expect(knowledge).toBeDefined()
    expect(knowledge.projectPath).toBe(mockProjectDir)
    expect(fs.writeFileSync).toHaveBeenCalled()
  })

  it('learnFromProject() dipanggil lagi < 24 jam -> return cache, tidak scan ulang', async () => {
    const cachedKnowledge = {
      projectHash: 'hash123',
      projectPath: mockProjectDir,
      lastUpdated: new Date().toISOString(), // now
      techStack: { language: 'typescript', framework: 'none', packageManager: 'npm' },
      conventions: { namingFiles: 'kebab-case', namingFunctions: 'camelCase', importStyle: 'import', semicolons: true, quotes: 'single', indentation: 2 },
      filesCreatedByPilot: [],
      filesEditedByPilot: [],
      notes: []
    }
    
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cachedKnowledge))
    
    const knowledge = await learnFromProject(mockProjectDir)
    
    expect(knowledge.projectHash).toBe('hash123')
    expect(fs.readdirSync).not.toHaveBeenCalled()
  })

  it('updateAfterExecute() -> filesCreatedByPilot terupdate', async () => {
    const cachedKnowledge = {
      projectHash: 'hash123',
      projectPath: mockProjectDir,
      lastUpdated: new Date().toISOString(),
      techStack: { language: 'typescript', framework: 'none', packageManager: 'npm' },
      conventions: { namingFiles: 'kebab-case', namingFunctions: 'camelCase', importStyle: 'import', semicolons: true, quotes: 'single', indentation: 2 },
      filesCreatedByPilot: [],
      filesEditedByPilot: [],
      notes: []
    }
    
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(cachedKnowledge))
    
    await updateAfterExecute(mockProjectDir, [{ path: 'src/newFile.ts', description: 'test create' }], [])
    
    expect(fs.writeFileSync).toHaveBeenCalled()
    const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0]
    const savedData = JSON.parse(writeCall![1] as string)
    
    expect(savedData.filesCreatedByPilot.length).toBe(1)
    expect(savedData.filesCreatedByPilot[0].path).toBe('src/newFile.ts')
  })
})
