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

    // Ctrl+W or Alt+Backspace: delete word before cursor
    if ((key.ctrl && input === 'w') || (key.meta && key.backspace)) {
      const before = deleteLastWord(value.slice(0, cursor))
      const next = before + value.slice(cursor)
      onValueChange(next, before.length)
      syncDropdown(next, onDropdownQuery, onDropdownClose, dropdownOpen)
      return
    }

    // Left arrow: move cursor left
    if (key.leftArrow) {
      onValueChange(value, Math.max(0, cursor - 1))
      return
    }

    // Right arrow: move cursor right
    if (key.rightArrow) {
      onValueChange(value, Math.min(value.length, cursor + 1))
      return
    }

    // Enter: submit (App.tsx handles Enter when dropdown open)
    if (key.return) {
      if (dropdownOpen) return
      if (value.trim()) onSubmit(value.trim())
      onValueChange('', 0)
      return
    }

    // Backspace: delete char before cursor
    if (key.backspace) {
      if (cursor === 0) return
      const next = value.slice(0, cursor - 1) + value.slice(cursor)
      onValueChange(next, cursor - 1)
      syncDropdown(next, onDropdownQuery, onDropdownClose, dropdownOpen)
      return
    }

    // Delete key: delete char at cursor (forward delete)
    if (key.delete) {
      if (cursor >= value.length) return
      const next = value.slice(0, cursor) + value.slice(cursor + 1)
      onValueChange(next, cursor)
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

  return (
    <Box borderStyle="single" borderColor={colors.muted} paddingX={1}>
      <Text color={colors.prompt}>{prompt} </Text>
      <Text color={colors.prompt}>{symbols.arrow} </Text>
      <Text>{value.slice(0, cursor)}</Text>
      <Text inverse>{atCursor}</Text>
      <Text>{value.slice(cursor + 1)}</Text>
    </Box>
  )
}
