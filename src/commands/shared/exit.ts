import { clearCredentials } from '../../config/credentials.js'
import { clearSession } from '../../state/session.js'
import { registerCommand, type CommandContext } from '../registry.js'

export async function exitHandler(ctx: CommandContext): Promise<void> {
  clearCredentials()
  clearSession()
  ctx.exit?.()
}

registerCommand({
  name: 'exit',
  description: 'Logout and exit the CLI',
  roles: ['unauthenticated', 'admin', 'client'],
  handler: exitHandler,
})
