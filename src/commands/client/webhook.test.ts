import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockSetWebhookUrl = vi.fn()
const mockSetWebhookRedisBasic = vi.fn()
const mockSetWebhookRedisVpn = vi.fn()

vi.mock('../../api/device.js', () => ({
	setWebhookUrl: mockSetWebhookUrl,
	setWebhookRedisBasic: mockSetWebhookRedisBasic,
	setWebhookRedisVpn: mockSetWebhookRedisVpn,
}))

type ShowFormFn = (title: string, fields: unknown, initial?: unknown) => Promise<Record<string, string> | undefined>

function makeCtx(args: string[], showForm?: ShowFormFn) {
	const writes: Array<{ text: string; type?: string }> = []
	return {
		args,
		write: (text: string, type?: string) => writes.push({ text, type }),
		writeLine: (line: { text: string; type: string }) => writes.push(line),
		showForm,
		writes,
	}
}

const redisCredentials = {
	host: 'redis.example.com',
	port: 6379,
	username: 'wa_abc123',
	password: 'deadbeef01234567',
	channel: 'wa:inbound:dev1:tok1',
}

describe('/webhook set url', () => {
	beforeEach(() => { clearSession(); vi.clearAllMocks() })

	it('sets url webhook and writes success', async () => {
		mockSetWebhookUrl.mockResolvedValue(undefined)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['url', 'https://my.server/hook'])

		await webhookSetHandler(ctx)

		expect(mockSetWebhookUrl).toHaveBeenCalledWith('https://my.server/hook', undefined)
		expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
	})

	it('passes secret when provided', async () => {
		mockSetWebhookUrl.mockResolvedValue(undefined)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['url', 'https://my.server/hook', 'mysecret'])

		await webhookSetHandler(ctx)

		expect(mockSetWebhookUrl).toHaveBeenCalledWith('https://my.server/hook', 'mysecret')
	})

	it('shows form when url is missing, executes on submit', async () => {
		mockSetWebhookUrl.mockResolvedValue(undefined)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['url'], async () => ({ type: 'url', url: 'https://filled.in/hook', secret: '' }))

		await webhookSetHandler(ctx)

		expect(mockSetWebhookUrl).toHaveBeenCalledWith('https://filled.in/hook', undefined)
		expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
	})

	it('returns without action when form is cancelled', async () => {
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['url'], async () => undefined)

		await webhookSetHandler(ctx)

		expect(mockSetWebhookUrl).not.toHaveBeenCalled()
		expect(ctx.writes).toHaveLength(0)
	})
})

describe('/webhook set redis', () => {
	beforeEach(() => { clearSession(); vi.clearAllMocks() })

	it('calls setWebhookRedisBasic and displays credentials', async () => {
		mockSetWebhookRedisBasic.mockResolvedValue(redisCredentials)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['redis'])

		await webhookSetHandler(ctx)

		expect(mockSetWebhookRedisBasic).toHaveBeenCalled()
		expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
		expect(ctx.writes.some((w) => w.text.includes('redis.example.com'))).toBe(true)
		expect(ctx.writes.some((w) => w.text.includes('deadbeef01234567'))).toBe(true)
		expect(ctx.writes.some((w) => w.text.includes('wa:inbound:dev1:tok1'))).toBe(true)
	})
})

describe('/webhook set redis-vpn', () => {
	beforeEach(() => { clearSession(); vi.clearAllMocks() })

	it('calls setWebhookRedisVpn with pubkey and displays credentials', async () => {
		mockSetWebhookRedisVpn.mockResolvedValue(redisCredentials)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['redis-vpn', 'wgpubkeyABCDEF=='])

		await webhookSetHandler(ctx)

		expect(mockSetWebhookRedisVpn).toHaveBeenCalledWith('wgpubkeyABCDEF==')
		expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
		expect(ctx.writes.some((w) => w.text.includes('redis.example.com'))).toBe(true)
	})

	it('shows form when pubkey is missing, executes on submit', async () => {
		mockSetWebhookRedisVpn.mockResolvedValue(redisCredentials)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['redis-vpn'], async () => ({ type: 'redis-vpn', pubkey: 'wgpubkeyXYZ==' }))

		await webhookSetHandler(ctx)

		expect(mockSetWebhookRedisVpn).toHaveBeenCalledWith('wgpubkeyXYZ==')
		expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
	})

	it('returns without action when form is cancelled', async () => {
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['redis-vpn'], async () => undefined)

		await webhookSetHandler(ctx)

		expect(mockSetWebhookRedisVpn).not.toHaveBeenCalled()
		expect(ctx.writes).toHaveLength(0)
	})
})

describe('/webhook — interactive form', () => {
	beforeEach(() => { clearSession(); vi.clearAllMocks() })

	it('shows form when no args, executes redis on submit', async () => {
		mockSetWebhookRedisBasic.mockResolvedValue(redisCredentials)
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx([], async () => ({ type: 'redis' }))

		await webhookSetHandler(ctx)

		expect(mockSetWebhookRedisBasic).toHaveBeenCalled()
		expect(ctx.writes.some((w) => w.type === 'success')).toBe(true)
	})

	it('returns without action when form is cancelled', async () => {
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx([], async () => undefined)

		await webhookSetHandler(ctx)

		expect(ctx.writes).toHaveLength(0)
	})
})

describe('/webhook — errors', () => {
	beforeEach(() => { clearSession(); vi.clearAllMocks() })

	it('writes error on API failure', async () => {
		mockSetWebhookUrl.mockRejectedValue(Object.assign(new Error('fail'), {
			isAxiosError: true,
			response: { status: 400, data: { error: 'VALIDATION_ERROR', message: 'Invalid URL' } },
		}))
		const { webhookSetHandler } = await import('./webhook.js')
		const ctx = makeCtx(['url', 'not-a-url'])

		await webhookSetHandler(ctx)

		expect(ctx.writes.some((w) => w.type === 'error')).toBe(true)
	})
})
