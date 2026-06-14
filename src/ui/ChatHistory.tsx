import { Box, Text } from 'ink'
import type { OutputLine, OutputType } from '../commands/registry.js'
import { colors, symbols } from './theme.js'

export function buildPrefix(type: OutputType): string {
  switch (type) {
    case 'success': return symbols.check + ' '
    case 'error':   return symbols.cross + ' '
    case 'info':    return symbols.bullet + ' '
    default:        return ''
  }
}

function lineColor(type: OutputType): string {
  if (type === 'success') return colors.success
  if (type === 'error')   return colors.error
  if (type === 'info')    return colors.info
  return colors.highlight
}

function formatTimestamp(date?: Date): string {
  if (!date) return ''
  const h  = date.getHours().toString().padStart(2, '0')
  const m  = date.getMinutes().toString().padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const d  = date.getDate().toString().padStart(2, '0')
  const mo = months[date.getMonth()]
  return `${h}:${m}  ${d} ${mo}`
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
      {visible.map((line, i) => {
        const key = start + i

        if (line.type === 'cmd-spacer') {
          return <Text key={key}> </Text>
        }

        if (line.type === 'cmd-header') {
          return (
            <Box key={key} justifyContent="space-between">
              <Text bold color={colors.highlight}>▸ /{line.text}</Text>
              <Text color={colors.muted}> {formatTimestamp(line.timestamp)}</Text>
            </Box>
          )
        }

        if (line.type === 'cmd-arg') {
          return (
            <Text key={key} color={colors.muted}>{'  '}{line.text}</Text>
          )
        }

        return (
          <Text key={key} color={lineColor(line.type)}>
            {buildPrefix(line.type)}{line.text}
          </Text>
        )
      })}
    </Box>
  )
}
