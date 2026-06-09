import { Text } from 'ink'
import { formatProgress } from './progressHelpers.js'

interface Props {
  pct: number
  label?: string
}

export default function ProgressBar({ pct, label }: Props) {
  return (
    <Text color="cyan">
      {label ? `${label}  ` : ''}{formatProgress(pct)}
    </Text>
  )
}
