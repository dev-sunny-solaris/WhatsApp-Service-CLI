import { Text } from 'ink'
import chalk from 'chalk'

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
  if (role === 'unauthenticated' || !status) {
    return <Text dimColor> · Not connected</Text>
  }

  const dot = status.connected ? chalk.green('●') : chalk.red('○')
  const label = status.connected ? chalk.green('Connected') : chalk.red('Disconnected')
  const phone = status.phone ? chalk.cyan(status.phone) : chalk.dim('—')

  const dailyPart =
    status.dailyLimit !== null
      ? `${chalk.yellow(String(status.dailyUsed))}${chalk.dim('/')}${chalk.dim(String(status.dailyLimit))} ${chalk.dim('today')}`
      : chalk.dim(`${status.dailyUsed} sent today`)

  const sep = chalk.dim('  ·  ')
  return <Text>{` ${dot} ${label}${sep}${phone}${sep}${dailyPart}`}</Text>
}
