import { describe, expect, it } from 'vitest'
import { formatTable, writeTable } from './tableFormatter.js'

describe('formatTable', () => {
  const headers = ['ID', 'Name', 'Status']
  const rows = [
    ['dev-001', 'Main Device', 'connected'],
    ['dev-002', 'Backup', 'disconnected'],
  ]

  it('returns 6 lines for 2 rows (sep + header + sep + row + row + sep)', () => {
    expect(formatTable(headers, rows)).toHaveLength(6)
  })

  it('first and last lines are separators starting with +', () => {
    const lines = formatTable(headers, rows)
    expect(lines[0]).toMatch(/^\+/)
    expect(lines[lines.length - 1]).toMatch(/^\+/)
  })

  it('header row contains all column names', () => {
    const lines = formatTable(headers, rows)
    expect(lines[1]).toContain('ID')
    expect(lines[1]).toContain('Name')
    expect(lines[1]).toContain('Status')
  })

  it('data rows contain cell values', () => {
    const lines = formatTable(headers, rows)
    expect(lines[3]).toContain('dev-001')
    expect(lines[3]).toContain('Main Device')
    expect(lines[4]).toContain('dev-002')
    expect(lines[4]).toContain('disconnected')
  })

  it('column widths fit longest value', () => {
    const lines = formatTable(['A'], [['short'], ['much longer value']])
    const dataRows = lines.slice(3, -1)
    dataRows.forEach((r) => expect(r.length).toBe(lines[1].length))
  })

  it('handles single row', () => {
    const lines = formatTable(['Col'], [['val']])
    expect(lines).toHaveLength(5)
  })

  it('handles empty rows (header only)', () => {
    const lines = formatTable(['Col'], [])
    expect(lines).toHaveLength(3)
  })
})

describe('writeTable', () => {
  it('writes header line with info type', () => {
    const writes: Array<{ text: string; type?: string }> = []
    writeTable((text, type) => writes.push({ text, type }), ['ID'], [['val']])
    const header = writes.find((w) => w.text.includes('ID') && !w.text.startsWith('+'))
    expect(header?.type).toBe('info')
  })

  it('writes separator lines with raw type', () => {
    const writes: Array<{ text: string; type?: string }> = []
    writeTable((text, type) => writes.push({ text, type }), ['ID'], [['val']])
    const seps = writes.filter((w) => w.text.startsWith('+'))
    seps.forEach((s) => expect(s.type).toBe('raw'))
  })
})
