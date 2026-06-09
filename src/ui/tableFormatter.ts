export function formatTable(headers: string[], rows: string[][]): string[] {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)),
  )

  const sep = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+'
  const fmt = (cells: string[]) =>
    '| ' + cells.map((c, i) => (c ?? '').padEnd(widths[i])).join(' | ') + ' |'

  if (rows.length === 0) return [sep, fmt(headers), sep]
  return [sep, fmt(headers), sep, ...rows.map(fmt), sep]
}

export function writeTable(
  write: (text: string, type?: string) => void,
  headers: string[],
  rows: string[][],
): void {
  const lines = formatTable(headers, rows)
  lines.forEach((line, i) => {
    // index 1 = header row → 'info' (cyan); all other lines → 'raw' (white)
    write(line, i === 1 ? 'info' : 'raw')
  })
}
