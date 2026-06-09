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
}

export default function ChatHistory({ messages }: Props) {
  return (
    <Box flexDirection="column">
      {messages.map((line, i) => (
        <Text key={i} color={lineColor(line.type)}>
          {buildPrefix(line.type)}{line.text}
        </Text>
      ))}
    </Box>
  )
}
