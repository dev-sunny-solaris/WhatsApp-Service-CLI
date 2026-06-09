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

export async function getMe(): Promise<MeInfo> {
  return unwrap(getHttp().get('/me'))
}

export async function setWebhook(webhookUrl: string, webhookSecret?: string): Promise<void> {
  await unwrap(
    getHttp().patch('/me/webhook', {
      webhook_url: webhookUrl,
      ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
    }),
  )
}

// ─── Connection ──────────────────────────────────────────────────────────────

export async function connect(): Promise<void> {
  await unwrap(getHttp().post('/me/connect', {}))
}

export async function logout(): Promise<void> {
  await unwrap(getHttp().post('/me/logout', {}))
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface SendResult {
  message_id: string | null
}

export async function sendText(to: string, message: string): Promise<SendResult> {
  return unwrap(getHttp().post('/messages/send/text', { to, message }))
}

export async function sendMedia(
  to: string,
  uploadId: string,
  caption?: string,
): Promise<SendResult> {
  return unwrap(
    getHttp().post('/messages/send/media', {
      to,
      upload_id: uploadId,
      ...(caption ? { caption } : {}),
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

export async function uploadInit(
  filename: string,
  mimetype: string,
  size: number,
): Promise<UploadInitResult> {
  return unwrap(getHttp().post('/media/upload/init', { filename, mimetype, size }))
}

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

export async function uploadComplete(uploadId: string): Promise<UploadCompleteResult> {
  return unwrap(getHttp().post(`/media/upload/${uploadId}/complete`, {}))
}

export async function uploadDirect(filePath: string, mimetype = 'application/octet-stream'): Promise<UploadCompleteResult> {
  const buffer = await readFile(filePath)
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimetype }), basename(filePath))
  return unwrap(getHttp().post('/media/upload/direct', form))
}

// ─── Packages ────────────────────────────────────────────────────────────────

export async function listPackages(): Promise<Record<string, unknown>> {
  return unwrap(getHttp().get('/packages'))
}
