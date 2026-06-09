import { Box, Text } from 'ink'
import type { OutputLine, OutputType } from '../commands/registry.js'
import { colors, symbols } from './theme.js'

export function buildPrefix(type: OutputType): string {
  switch (type) {
    case 'success': return symbols.check + ' '
    case 'error':   return symbols.cross + ' '
    case 'info':    return symbols.bullet + ' '
    case 'raw':     return ''
  }
}

function lineColor(type: OutputType): string {
  return colors[type === 'raw' ? 'highlight' : type]
}

interface Props {
  messages: OutputLine[]
  scrollOffset: number
  maxRows: number
}

export default function ChatHistory({ messages, scrollOffset, maxRows }: Props) {
  const total = messages.length
  const safeOffset = Math.min(scrollOffset, Math.max(0, total - 1))
  const end = total - safeOffset
  const start = Math.max(0, end - maxRows)
  const visible = messages.slice(start, end)
  const hiddenAbove = start

  return (
    <Box flexDirection="column">
      {hiddenAbove > 0 && (
        <Text dimColor>{` ↑ ${hiddenAbove} message${hiddenAbove > 1 ? 's' : ''} above  ·  PgUp / PgDn to scroll`}</Text>
      )}
      {visible.map((line, i) => (
        <Text key={start + i} color={lineColor(line.type)}>
          {buildPrefix(line.type)}{line.text}
        </Text>
      ))}
    </Box>
  )
}
