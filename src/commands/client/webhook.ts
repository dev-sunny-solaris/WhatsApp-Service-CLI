import { setWebhookUrl, setWebhookRedisBasic, setWebhookRedisVpn } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import { registerCommand, type CommandContext, type FieldDef, type FormValues } from '../registry.js'

async function execWebhookUrl(ctx: CommandContext, url: string, secret?: string): Promise<void> {
	await setWebhookUrl(url, secret)
	ctx.write(`Webhook set: ${url}`, 'success')
}

async function execWebhookRedis(ctx: CommandContext): Promise<void> {
	const result = await setWebhookRedisBasic()
	ctx.write('Redis webhook configured. Save these credentials — shown once only:', 'success')
	ctx.write(`Host:     ${result.host}:${result.port}`, 'raw')
	ctx.write(`Username: ${result.username}`, 'raw')
	ctx.write(`Password: ${result.password}`, 'raw')
	ctx.write(`Channel:  ${result.channel}`, 'raw')
}

async function execWebhookRedisVpn(ctx: CommandContext, pubkey: string): Promise<void> {
	const result = await setWebhookRedisVpn(pubkey)
	ctx.write('Redis VPN webhook configured. Save these credentials — shown once only:', 'success')
	ctx.write(`Host:     ${result.host}:${result.port}`, 'raw')
	ctx.write(`Username: ${result.username}`, 'raw')
	ctx.write(`Password: ${result.password}`, 'raw')
	ctx.write(`Channel:  ${result.channel}`, 'raw')
}

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
export async function webhookSetHandler(ctx: CommandContext): Promise<void> {
	const [typeArg, ...rest] = ctx.args

	// Direct execution when all required args are already present
	if (typeArg === 'redis') {
		try { await execWebhookRedis(ctx) } catch (e) { writeErr(ctx, e) }
		return
	}
	if (typeArg === 'url' && rest[0]) {
		try { await execWebhookUrl(ctx, rest[0], rest[1]) } catch (e) { writeErr(ctx, e) }
		return
	}
	if (typeArg === 'redis-vpn' && rest[0]) {
		try { await execWebhookRedisVpn(ctx, rest[0]) } catch (e) { writeErr(ctx, e) }
		return
	}

	// Build initial values from any args already provided
	const initial: FormValues = {}
	if (typeArg === 'url' || typeArg === 'redis' || typeArg === 'redis-vpn') initial.type = typeArg
	if (typeArg === 'url' && rest[0]) initial.url = rest[0]
	if (typeArg === 'url' && rest[1]) initial.secret = rest[1]
	if (typeArg === 'redis-vpn' && rest[0]) initial.pubkey = rest[0]

	const result = await ctx.showForm?.('Configure Webhook', (values: FormValues): FieldDef[] => {
		const base: FieldDef[] = [{
			key: 'type', label: 'Delivery type', type: 'select',
			options: [
				{ label: 'url — HTTP POST to your server',   value: 'url' },
				{ label: 'redis — Redis Pub/Sub',             value: 'redis' },
				{ label: 'redis-vpn — Redis via WireGuard',  value: 'redis-vpn' },
			],
		}]
		const t = values.type
		if (!t || t === 'url') return [
			...base,
			{ key: 'url',    label: 'Webhook URL', placeholder: 'https://example.com/webhook' },
			{ key: 'secret', label: 'Signing secret', optional: true },
		]
		if (t === 'redis-vpn') return [
			...base,
			{ key: 'pubkey', label: 'WireGuard public key' },
		]
		return base
	}, initial)
	if (!result) return

	const formArgs: Array<{ key: string; value: string }> = [{ key: 'type', value: result.type }]
	if (result.type === 'url') {
		formArgs.push({ key: 'url', value: result.url })
		if (result.secret) formArgs.push({ key: 'secret', value: result.secret })
	}
	if (result.type === 'redis-vpn') formArgs.push({ key: 'pubkey', value: result.pubkey })
	ctx.writeCommandArgs?.(formArgs)

	try {
		if (result.type === 'url') {
			await execWebhookUrl(ctx, result.url, result.secret || undefined)
		} else if (result.type === 'redis') {
			await execWebhookRedis(ctx)
		} else if (result.type === 'redis-vpn') {
			await execWebhookRedisVpn(ctx, result.pubkey)
		}
	} catch (e) {
		writeErr(ctx, e)
	}
}

function writeErr(ctx: CommandContext, e: unknown): void {
	const err = normalizeError(e)
	ctx.write(`[${err.code}] ${err.message}`, 'error')
}

registerCommand({ name: 'webhook', usage: '[url|redis|redis-vpn] [args]', params: ['type'], description: 'Configure webhook delivery', roles: ['client'], handler: webhookSetHandler })
