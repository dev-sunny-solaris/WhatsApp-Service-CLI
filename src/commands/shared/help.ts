import { getRole } from '../../state/session.js'
import { getCommandsForRole, registerCommand, type CommandContext, type CommandDef } from '../registry.js'

/**
 * @param {CommandDef} cmd
 * @returns {string}
 */
function nameUsage(cmd: CommandDef): string {
	return `/${cmd.name}${cmd.usage ? ' ' + cmd.usage : ''}`
}

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
async function helpHandler(ctx: CommandContext): Promise<void> {
	const role = getRole()
	const commands = getCommandsForRole(role).sort((a, b) => a.name.localeCompare(b.name))

	const maxLen = Math.max(...commands.map((cmd) => nameUsage(cmd).length))

	const groups = new Map<string, CommandDef[]>()
	for (const cmd of commands) {
		const prefix = cmd.name.split(' ')[0]
		const group = groups.get(prefix) ?? []
		group.push(cmd)
		groups.set(prefix, group)
	}

	ctx.write('')
	for (const [, cmds] of groups) {
		for (const cmd of cmds) {
			const left = nameUsage(cmd).padEnd(maxLen + 2)
			ctx.write(`  ${left}  ${cmd.description}`, 'raw')
		}
		ctx.write('', 'raw')
	}
}

registerCommand({
	name: 'help',
	usage: '',
	description: 'Show available commands',
	roles: ['unauthenticated', 'admin', 'client'],
	handler: helpHandler,
})
