import { registerCommand, type CommandContext } from '../registry.js'

export async function clearHandler(ctx: CommandContext): Promise<void> {
  ctx.clear?.()
}

registerCommand({
  name: 'clear',
  usage: '',
  description: 'Clear chat history',
  roles: ['unauthenticated', 'admin', 'client'],
  handler: clearHandler,
})
