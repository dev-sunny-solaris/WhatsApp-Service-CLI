export interface SelectItem {
  label: string
  value: string
}

export function formatSelectItem(label: string, selected: boolean): string {
  return selected ? `> ${label}` : `  ${label}`
}

export function nextSelectIndex(current: number, total: number): number {
  return (current + 1) % total
}

export function prevSelectIndex(current: number, total: number): number {
  return (current - 1 + total) % total
}
