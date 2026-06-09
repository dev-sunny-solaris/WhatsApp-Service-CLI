import chalk from 'chalk'
import { Box, Text, useInput } from 'ink'
import { colors, symbols } from './theme.js'

interface Props {
  value: string
  cursor: number
  onValueChange: (value: string, cursor: number) => void
  role: string
  onSubmit: (value: string) => void
  onDropdownQuery: (query: string) => void
  onDropdownClose: () => void
  dropdownOpen: boolean
}

function deleteLastWord(text: string): string {
  let i = text.length - 1
  while (i >= 0 && text[i] === ' ') i--
  while (i >= 0 && text[i] !== ' ') i--
  return text.slice(0, i + 1)
}

function wordLeft(text: string, pos: number): number {
  let i = pos
  while (i > 0 && text[i - 1] === ' ') i--
  while (i > 0 && text[i - 1] !== ' ') i--
  return i
}

function wordRight(text: string, pos: number): number {
  let i = pos
  while (i < text.length && text[i] === ' ') i++
  while (i < text.length && text[i] !== ' ') i++
  return i
}

function syncDropdown(
  next: string,
  onDropdownQuery: (q: string) => void,
  onDropdownClose: () => void,
  dropdownOpen: boolean,
) {
  if (next.startsWith('/')) onDropdownQuery(next.slice(1))
  else if (dropdownOpen) onDropdownClose()
}

export default function InputBar({
  value,
  cursor,
  onValueChange,
  role,
  onSubmit,
  onDropdownQuery,
  onDropdownClose,
  dropdownOpen,
}: Props) {
  useInput((input, key) => {
    // Escape: clear
    if (key.escape) {
      if (dropdownOpen) onDropdownClose()
      onValueChange('', 0)
      return
    }

    // Ctrl+U: clear entire line
    if (key.ctrl && input === 'u') {
      onValueChange('', 0)
      onDropdownClose()
      return
    }

    // Ctrl+A: go to start
    if (key.ctrl && input === 'a') {
      onValueChange(value, 0)
      return
    }

    // Ctrl+E: go to end
    if (key.ctrl && input === 'e') {
      onValueChange(value, value.length)
      return
    }

    // Ctrl+W or Alt+Backspace (meta+delete = \x1b\x7f): delete word before cursor
    // Note: ink parses \x7f as key.delete (not key.backspace) — meta+\x7f = Alt+Backspace
    if ((key.ctrl && input === 'w') || (key.meta && key.delete)) {
      const before = deleteLastWord(value.slice(0, cursor))
      const next = before + value.slice(cursor)
      onValueChange(next, before.length)
      syncDropdown(next, onDropdownQuery, onDropdownClose, dropdownOpen)
      return
    }

    // Left arrow: move cursor left; Ctrl+Left: jump word left
    if (key.leftArrow) {
      const next = key.ctrl ? wordLeft(value, cursor) : Math.max(0, cursor - 1)
      onValueChange(value, next)
      return
    }

    // Right arrow: move cursor right; Ctrl+Right: jump word right
    if (key.rightArrow) {
      const next = key.ctrl ? wordRight(value, cursor) : Math.min(value.length, cursor + 1)
      onValueChange(value, next)
      return
    }

    // Enter: submit (App.tsx handles Enter when dropdown open)
    if (key.return) {
      if (dropdownOpen) return
      if (value.trim()) onSubmit(value.trim())
      onValueChange('', 0)
      return
    }

    // Backspace (delete char before cursor)
    // ink parses Backspace key (\x7f) as key.delete — so handle both key.backspace and key.delete
    // Exclude meta+delete (= Alt+Backspace, handled above as delete-word)
    if ((key.backspace || key.delete) && !key.meta) {
      if (cursor === 0) return
      const next = value.slice(0, cursor - 1) + value.slice(cursor)
      onValueChange(next, cursor - 1)
      syncDropdown(next, onDropdownQuery, onDropdownClose, dropdownOpen)
      return
    }

    // Printable characters: insert at cursor position
    if (input && !key.ctrl && !key.meta && !key.tab) {
      const next = value.slice(0, cursor) + input + value.slice(cursor)
      onValueChange(next, cursor + input.length)
      syncDropdown(next, onDropdownQuery, onDropdownClose, dropdownOpen)
    }
  })

  const prompt = `[${role}]`
  const atCursor = value[cursor] ?? ' '

  // Build entire line as single chalk string — avoids nested <Text> yoga layout issues
  // where <Text inverse> creates a block node instead of inline span
  const line =
    chalk.yellow(`${prompt} ${symbols.arrow} `) +
    value.slice(0, cursor) +
    chalk.inverse(atCursor) +
    value.slice(cursor + 1)

  return (
    <Box borderStyle="single" borderColor={colors.muted} paddingX={1}>
      <Text wrap="wrap">{line}</Text>
    </Box>
  )
}
