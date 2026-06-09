import { Box, Text } from 'ink'
import type { CommandDef } from '../commands/registry.js'
import { colors } from './theme.js'

export function filterCommands(commands: CommandDef[], prefix: string): CommandDef[] {
  const q = prefix.toLowerCase()
  return commands.filter((c) => c.name.startsWith(q))
}

export function nextIndex(current: number, total: number): number {
  return (current + 1) % total
}

export function prevIndex(current: number, total: number): number {
  return (current - 1 + total) % total
}

interface Props {
  commands: CommandDef[]
  selectedIndex: number
}

export default function CommandDropdown({ commands, selectedIndex }: Props) {
  if (commands.length === 0) return null

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={colors.muted}>
      {commands.map((cmd, i) => (
        <Box key={cmd.name} paddingX={1}>
          <Text
            color={i === selectedIndex ? colors.prompt : colors.muted}
            bold={i === selectedIndex}
          >
            /{cmd.name}
          </Text>
          <Text color={colors.muted}> — {cmd.description}</Text>
        </Box>
      ))}
    </Box>
  )
}
