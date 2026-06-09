import { Box, Text } from 'ink'
import chalk from 'chalk'
import { VERSION } from '../version.js'

export interface StatusInfo {
  connected: boolean
  phone: string | null
  dailyUsed: number
  dailyLimit: number | null
}

interface Props {
  status: StatusInfo | null
  role: string
}

export default function StatusBar({ status, role }: Props) {
  const versionLabel = chalk.dim(`v${VERSION}`)

  if (role === 'unauthenticated' || !status) {
    return (
      <Box justifyContent="space-between">
        <Text dimColor> · Not connected</Text>
        <Text>{versionLabel}</Text>
      </Box>
    )
  }

  const dot = status.connected ? chalk.green('●') : chalk.red('○')
  const label = status.connected ? chalk.green('Connected') : chalk.red('Disconnected')
  const phone = status.phone ? chalk.cyan(status.phone) : chalk.dim('—')

  const dailyPart =
    status.dailyLimit !== null
      ? `${chalk.yellow(String(status.dailyUsed))}${chalk.dim('/')}${chalk.dim(String(status.dailyLimit))} ${chalk.dim('today')}`
      : chalk.dim(`${status.dailyUsed} sent today`)

  const sep = chalk.dim('  ·  ')
  const left = ` ${dot} ${label}${sep}${phone}${sep}${dailyPart}`

  return (
    <Box justifyContent="space-between">
      <Text>{left}</Text>
      <Text>{versionLabel}</Text>
    </Box>
  )
}
