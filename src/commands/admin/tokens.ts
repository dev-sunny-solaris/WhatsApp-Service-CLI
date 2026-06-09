import { listTokens, revokeAllTokens, revokeToken } from '../../api/admin.js'
import { normalizeError } from '../../api/client.js'
import { writeTable } from '../../ui/tableFormatter.js'
import { clearSession, getSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function tokensListHandler(ctx: CommandContext): Promise<void> {
  try {
    const tokens = await listTokens()
    if (tokens.length === 0) {
      ctx.write('No active tokens', 'info')
      return
    }
    writeTable(
      ctx.write,
      ['Prefix', 'Name', 'Created At'],
      tokens.map((t) => [t.token_prefix, t.name, t.created_at]),
    )
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

export async function tokensRevokeHandler(ctx: CommandContext): Promise<void> {
  const { credentials } = getSession()
  if (!credentials.accessToken) {
    ctx.write('No active session token found', 'error')
    return
  }
  try {
    await revokeToken(credentials.accessToken)
    clearSession()
    ctx.write('Token revoked · session cleared', 'success')
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

export async function tokensRevokeAllHandler(ctx: CommandContext): Promise<void> {
  try {
    await revokeAllTokens()
    clearSession()
    ctx.write('All tokens revoked · session cleared', 'success')
  } catch (e) {
    const err = normalizeError(e)
    ctx.write(`[${err.code}] ${err.message}`, 'error')
  }
}

registerCommand({ name: 'tokens list',       description: 'List active admin tokens',  roles: ['admin'], handler: tokensListHandler })
registerCommand({ name: 'tokens revoke',     description: 'Revoke current session',    roles: ['admin'], handler: tokensRevokeHandler })
registerCommand({ name: 'tokens revoke-all', description: 'Revoke all admin tokens',   roles: ['admin'], handler: tokensRevokeAllHandler })
