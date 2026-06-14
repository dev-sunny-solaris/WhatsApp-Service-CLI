import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { getHttp, unwrap } from './client.js'

// ─── Me ──────────────────────────────────────────────────────────────────────

export interface MeInfo {
	id: string
	name: string
	phone_number: string | null
	is_connected: boolean
	daily_used: number
	quota: {
		package: string
		total: number | null
		used: number
		remaining: number | null
		period_days: number
		expires_at: string
		daily_limit: number
		status: string
	} | null
}

/**
 * @returns {Promise<MeInfo>}
 */
export async function getMe(): Promise<MeInfo> {
	return unwrap(getHttp().get('/me'))
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export interface WebhookRedisResult {
	host: string
	port: number
	username: string
	password: string
	channel: string
}

/**
 * @param {string} webhookUrl
 * @param {string} [webhookSecret]
 * @returns {Promise<void>}
 */
export async function setWebhookUrl(webhookUrl: string, webhookSecret?: string): Promise<void> {
	await unwrap(
		getHttp().patch('/me/webhook', {
			type: 'url',
			webhook_url: webhookUrl,
			...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
		}),
	)
}

/**
 * @returns {Promise<WebhookRedisResult>}
 */
export async function setWebhookRedisBasic(): Promise<WebhookRedisResult> {
	return unwrap(getHttp().patch('/me/webhook', { type: 'redis_basic' }))
}

/**
 * @param {string} wgConsumerPubkey
 * @returns {Promise<WebhookRedisResult>}
 */
export async function setWebhookRedisVpn(wgConsumerPubkey: string): Promise<WebhookRedisResult> {
	return unwrap(
		getHttp().patch('/me/webhook', {
			type: 'redis_vpn',
			wg_consumer_pubkey: wgConsumerPubkey,
		}),
	)
}

// ─── Connection ──────────────────────────────────────────────────────────────

/**
 * @returns {Promise<void>}
 */
export async function connect(): Promise<void> {
	await unwrap(getHttp().post('/me/connect', {}))
}

/**
 * @returns {Promise<void>}
 */
export async function logout(): Promise<void> {
	await unwrap(getHttp().post('/me/logout', {}))
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface ContactCheckResult {
	phone: string
	jid: string
	profile_picture_url: string | null
}

/**
 * @param {string} phone
 * @returns {Promise<ContactCheckResult>}
 */
export async function checkContact(phone: string): Promise<ContactCheckResult> {
	return unwrap(getHttp().get(`/contacts/${phone}/check`))
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface SendResult {
	message_id: string | null
}

/**
 * @param {string} to
 * @param {string} message
 * @returns {Promise<SendResult>}
 */
export async function sendText(to: string, message: string): Promise<SendResult> {
	return unwrap(getHttp().post('/messages/send/text', { to, message }))
}

/**
 * @param {string} to
 * @param {string} uploadId
 * @param {string} [caption]
 * @param {boolean} [forceDocument]
 * @returns {Promise<SendResult>}
 */
export async function sendMedia(
	to: string,
	uploadId: string,
	caption?: string,
	forceDocument?: boolean,
): Promise<SendResult> {
	return unwrap(
		getHttp().post('/messages/send/media', {
			to,
			upload_id: uploadId,
			...(caption ? { caption } : {}),
			...(forceDocument ? { force_document: true } : {}),
		}),
	)
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export interface UploadInitResult {
	upload_id: string
}

export interface UploadCompleteResult {
	upload_id: string
	filename: string
	mimetype: string
	size: number
}

/**
 * @param {string} filename
 * @param {string} mimetype
 * @param {number} size
 * @returns {Promise<UploadInitResult>}
 */
export async function uploadInit(
	filename: string,
	mimetype: string,
	size: number,
): Promise<UploadInitResult> {
	return unwrap(getHttp().post('/media/upload/init', { filename, mimetype, size }))
}

/**
 * @param {string} uploadId
 * @param {number} index
 * @param {Buffer} chunk
 * @returns {Promise<void>}
 */
export async function uploadChunk(
	uploadId: string,
	index: number,
	chunk: Buffer,
): Promise<void> {
	await unwrap(
		getHttp().post(`/media/upload/${uploadId}/chunk?index=${index}`, chunk, {
			headers: { 'Content-Type': 'application/octet-stream' },
		}),
	)
}

/**
 * @param {string} uploadId
 * @returns {Promise<UploadCompleteResult>}
 */
export async function uploadComplete(uploadId: string): Promise<UploadCompleteResult> {
	return unwrap(getHttp().post(`/media/upload/${uploadId}/complete`, {}))
}

/**
 * @param {string} filePath
 * @param {string} [mimetype]
 * @returns {Promise<UploadCompleteResult>}
 */
export async function uploadDirect(filePath: string, mimetype = 'application/octet-stream'): Promise<UploadCompleteResult> {
	const buffer = await readFile(filePath)
	const form = new FormData()
	form.append('file', new Blob([buffer], { type: mimetype }), basename(filePath))
	return unwrap(getHttp().post('/media/upload/direct', form))
}

// ─── Packages ────────────────────────────────────────────────────────────────

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function listPackages(): Promise<Record<string, unknown>> {
	return unwrap(getHttp().get('/packages'))
}
