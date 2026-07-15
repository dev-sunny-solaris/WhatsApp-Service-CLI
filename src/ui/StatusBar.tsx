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
  baseUrl: string
}

function extractHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export default function StatusBar({ status, role, baseUrl }: Props) {
  const versionLabel = chalk.dim(`v${VERSION}`)
  const sep = chalk.dim('  ·  ')
  const host = baseUrl ? chalk.white(extractHost(baseUrl)) : null

  if (role === 'unauthenticated' || !status) {
    const left = host
      ? ` ${host}${sep}${chalk.dim('Not connected')}`
      : chalk.dim(' · Not connected')
    return (
      <Box justifyContent="space-between">
        <Text>{left}</Text>
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

  const left = host
    ? ` ${host}${sep}${dot} ${label}${sep}${phone}${sep}${dailyPart}`
    : ` ${dot} ${label}${sep}${phone}${sep}${dailyPart}`

  return (
    <Box justifyContent="space-between">
      <Text>{left}</Text>
      <Text>{versionLabel}</Text>
    </Box>
  )
}
