import { Box, Text } from 'ink'
import { formatSelectItem, type SelectItem } from './selectHelpers.js'

export { formatSelectItem, nextSelectIndex, prevSelectIndex, type SelectItem } from './selectHelpers.js'

interface Props {
  items: SelectItem[]
  selectedIndex: number
  onSelect: (value: string) => void
  onCancel?: () => void
  prompt?: string
}

export default function SelectPrompt({ items, selectedIndex, prompt }: Props) {
  return (
    <Box flexDirection="column">
      {prompt && <Text color="yellow">{prompt}</Text>}
      {items.map((item, i) => (
        <Text key={item.value} color={i === selectedIndex ? 'white' : 'gray'}>
          {formatSelectItem(item.label, i === selectedIndex)}
        </Text>
      ))}
      <Text dimColor>↑↓ navigate  Enter/Tab select  Esc cancel</Text>
    </Box>
  )
}
