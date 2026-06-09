import { Text } from 'ink'
import { useEffect, useState } from 'react'
import { getSpinnerFrame, SPINNER_FRAMES } from './spinnerHelpers.js'

interface Props {
  label?: string
}

export default function Spinner({ label = 'Loading...' }: Props) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 80)
    return () => clearInterval(id)
  }, [])

  return (
    <Text color="cyan">
      {getSpinnerFrame(SPINNER_FRAMES, tick)}{label ? ` ${label}` : ''}
    </Text>
  )
}
