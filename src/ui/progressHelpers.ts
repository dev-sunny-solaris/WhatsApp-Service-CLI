const BAR_WIDTH = 20

export function formatProgress(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const filled  = Math.round((clamped / 100) * BAR_WIDTH)
  const bar     = '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
  return `${bar} ${clamped}%`
}
