import { checkContact } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { registerCommand, type CommandContext } from '../registry.js'

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
export async function contactCheckHandler(ctx: CommandContext): Promise<void> {
	let phone = ctx.args[0]

	if (!phone) {
		const result = await ctx.showForm?.('Contact Check', [
			{ key: 'phone', label: 'Phone number', placeholder: '628123456789' },
		])
		if (!result) return
		phone = result.phone
		ctx.writeCommandArgs?.([{ key: 'phone', value: phone }])
	}

	try {
		const result = await checkContact(phone)
		ctx.write(`Phone:   ${result.phone}`, 'raw')
		ctx.write(`JID:     ${result.jid}`, 'raw')
		ctx.write(`Picture: ${result.profile_picture_url ?? 'none'}`, 'raw')
	} catch (e) {
		const err = normalizeError(e)
		if (err.code === 'NOT_ON_WHATSAPP') {
			ctx.write('Not registered on WhatsApp', 'error')
			return
		}
		ctx.write(`[${err.code}] ${err.message}`, 'error')
	}
}

registerCommand({ name: 'contact check', usage: '<phone>', params: ['phone'], description: 'Check if phone number is registered on WhatsApp', roles: ['client'], handler: contactCheckHandler })
