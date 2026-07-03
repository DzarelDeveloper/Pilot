import { describe, it, expect } from 'vitest'
import { generateDiff } from '../../src/cli/ui/DiffView.js'

describe('generateDiff', () => {
  it('harus mengembalikan 1 removed + 1 added untuk perubahan satu baris', () => {
    const original = 'line1\nline2'
    const modified = 'line1\nline3'
    
    const chunks = generateDiff(original, modified)
    expect(chunks.length).toBeGreaterThan(0)
    
    let addedCount = 0
    let removedCount = 0
    chunks.forEach(c => {
      c.lines.forEach(l => {
        if (l.type === 'added') addedCount++
        if (l.type === 'removed') removedCount++
      })
    })
    
    expect(addedCount).toBe(1)
    expect(removedCount).toBe(1)
  })

  it('harus mengembalikan semua added untuk file baru', () => {
    const original = ''
    const modified = 'new content'
    
    const chunks = generateDiff(original, modified)
    expect(chunks.length).toBe(1)
    
    let addedCount = 0
    chunks.forEach(c => {
      c.lines.forEach(l => {
        if (l.type === 'added') addedCount++
      })
    })
    
    expect(addedCount).toBe(1)
  })

  it('harus mengembalikan array kosong untuk konten yang sama', () => {
    const chunks = generateDiff('same', 'same')
    expect(chunks.length).toBe(0)
  })
})
