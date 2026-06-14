import { getMe, type MeInfo } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { writeTable } from '../../ui/tableFormatter.js'
import { registerCommand, type CommandContext } from '../registry.js'

/**
 * @param {MeInfo} me
 * @returns {string[][]}
 */
export function buildMeRows(me: MeInfo): string[][] {
	const rows: string[][] = [
		['ID',     me.id],
		['Name',   me.name],
		['Phone',  me.phone_number ?? '—'],
		['Status', me.is_connected ? 'Connected' : 'Disconnected'],
	]

	if (me.quota) {
		const q = me.quota
		rows.push(['Daily', `${me.daily_used} / ${q.daily_limit} limit`])
		rows.push(['Quota', `${q.package} · ${q.used}/${q.total ?? '∞'} · ${q.status}`])
		rows.push(['Expires', q.expires_at])
	} else {
		rows.push(['Daily', String(me.daily_used)])
		rows.push(['Quota', 'no package'])
	}

	return rows
}

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
export async function meHandler(ctx: CommandContext): Promise<void> {
	try {
		const me = await getMe()
		writeTable(ctx.write, ['Field', 'Value'], buildMeRows(me))
	} catch (e) {
		const err = normalizeError(e)
		ctx.write(`[${err.code}] ${err.message}`, 'error')
	}
}

registerCommand({ name: 'me', usage: '', description: 'Show current device info', roles: ['client'], handler: meHandler })
