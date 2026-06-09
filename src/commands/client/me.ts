import { getMe, type MeInfo } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { registerCommand, type CommandContext } from '../registry.js'

export function formatMeInfo(me: MeInfo): string[] {
  const lines = [
    `ID:       ${me.id}`,
    `Name:     ${me.name}`,
    `Phone:    ${me.phone_number ?? 'not set'}`,
    `Status:   ${me.is_connected ? 'Connected' : 'Disconnected'}`,
    `Daily:    ${me.daily_used} messages used today`,
  ]
  if (me.quota) {
    const q = me.quota
    lines.push(`Quota:    ${q.package} · ${q.used}/${q.total ?? '∞'} used · ${q.status}`)
    lines.push(`Expires:  ${q.expires_at}  Daily limit: ${q.daily_limit}`)
  }
  return lines
}

export async function meHandler(ctx: CommandContext): Promise<void> {
  try {
    const me = await getMe()
    formatMeInfo(me).forEach((line) => ctx.write(line, 'raw'))
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({ name: 'me', description: 'Show current device info', roles: ['client'], handler: meHandler })
