import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession } from '../../state/session.js'

const mockCheckContact = vi.fn()
vi.mock('../../api/device.js', () => ({ checkContact: mockCheckContact }))

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

describe('/contact check', () => {
	beforeEach(() => { clearSession(); vi.clearAllMocks() })

	it('displays phone, jid and picture url on success', async () => {
		mockCheckContact.mockResolvedValue({
			phone: '628123456789',
			jid: '628123456789@s.whatsapp.net',
			profile_picture_url: 'https://pps.whatsapp.net/v/t61.7592-19/abc',
		})
		const { contactCheckHandler } = await import('./contact.js')
		const ctx = makeCtx(['628123456789'])

		await contactCheckHandler(ctx)

		expect(mockCheckContact).toHaveBeenCalledWith('628123456789')
		expect(ctx.writes.some((w) => w.text.includes('628123456789@s.whatsapp.net'))).toBe(true)
		expect(ctx.writes.some((w) => w.text.includes('pps.whatsapp.net'))).toBe(true)
	})

	it('displays "none" when profile_picture_url is null', async () => {
		mockCheckContact.mockResolvedValue({
			phone: '628123456789',
			jid: '628123456789@s.whatsapp.net',
			profile_picture_url: null,
		})
		const { contactCheckHandler } = await import('./contact.js')
		const ctx = makeCtx(['628123456789'])

		await contactCheckHandler(ctx)

		expect(ctx.writes.some((w) => w.text.includes('none'))).toBe(true)
	})

	it('writes specific message for NOT_ON_WHATSAPP', async () => {
		mockCheckContact.mockRejectedValue(Object.assign(new Error('not on wa'), {
			isAxiosError: true,
			response: { status: 404, data: { error: 'NOT_ON_WHATSAPP', message: 'Not on WhatsApp' } },
		}))
		const { contactCheckHandler } = await import('./contact.js')
		const ctx = makeCtx(['628000000000'])

		await contactCheckHandler(ctx)

		expect(ctx.writes.some((w) => w.type === 'error' && w.text.includes('Not registered'))).toBe(true)
	})

	it('shows form when phone is missing, checks contact on submit', async () => {
		mockCheckContact.mockResolvedValue({
			phone: '628123456789',
			jid: '628123456789@s.whatsapp.net',
			profile_picture_url: null,
		})
		const { contactCheckHandler } = await import('./contact.js')
		const ctx = makeCtx([], async () => ({ phone: '628123456789' }))

		await contactCheckHandler(ctx)

		expect(mockCheckContact).toHaveBeenCalledWith('628123456789')
	})

	it('returns without checking when form is cancelled', async () => {
		const { contactCheckHandler } = await import('./contact.js')
		const ctx = makeCtx([], async () => undefined)

		await contactCheckHandler(ctx)

		expect(mockCheckContact).not.toHaveBeenCalled()
		expect(ctx.writes).toHaveLength(0)
	})

	it('writes generic API error with code prefix', async () => {
		mockCheckContact.mockRejectedValue(Object.assign(new Error('fail'), {
			isAxiosError: true,
			response: { status: 503, data: { error: 'DEVICE_NOT_CONNECTED', message: 'Not connected' } },
		}))
		const { contactCheckHandler } = await import('./contact.js')
		const ctx = makeCtx(['628123456789'])

		await contactCheckHandler(ctx)

		expect(ctx.writes.some((w) => w.type === 'error' && w.text.includes('[DEVICE_NOT_CONNECTED]'))).toBe(true)
	})
})
