import { createElement } from 'react'
import { basename } from 'node:path'
import { sendMedia, sendText } from '../../api/device.js'
import { normalizeError } from '../../api/client.js'
import ProgressBar from '../../ui/ProgressBar.js'
import { registerCommand, type CommandContext, type FieldDef, type FormValues } from '../registry.js'
import { uploadFile } from './upload.js'

async function execSendText(ctx: CommandContext, to: string, message: string): Promise<void> {
	try {
		const result = await sendText(to, message)
		ctx.write(`Sent${result.message_id ? ` · ID: ${result.message_id}` : ''}`, 'success')
	} catch (e) {
		const err = normalizeError(e)
		ctx.write(`[${err.code}] ${err.message}`, 'error')
	}
}

async function execSendMedia(
	ctx: CommandContext,
	to: string,
	filePath: string,
	caption: string | undefined,
	forceDocument: boolean,
): Promise<void> {
	try {
		const label = basename(filePath)
		const uploadId = await uploadFile(filePath, (pct) => {
			ctx.setView?.(createElement(ProgressBar, { pct, label }))
		})
		ctx.setView?.(null)
		const result = await sendMedia(to, uploadId, caption, forceDocument || undefined)
		ctx.write(`Sent${result.message_id ? ` · ID: ${result.message_id}` : ''}`, 'success')
	} catch (e) {
		ctx.setView?.(null)
		const err = normalizeError(e)
		ctx.write(`[${err.code}] ${err.message}`, 'error')
	}
}

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
export async function sendHandler(ctx: CommandContext): Promise<void> {
	const result = await ctx.showForm?.('Send Message', (values: FormValues): FieldDef[] => {
		const base: FieldDef[] = [{
			key: 'type', label: 'Message type', type: 'select',
			options: [
				{ label: 'Text message', value: 'text' },
				{ label: 'Media file',   value: 'media' },
			],
		}]
		if (!values.type || values.type === 'text') return [
			...base,
			{ key: 'to',      label: 'To (phone number)', placeholder: '628123456789' },
			{ key: 'message', label: 'Message' },
		]
		return [
			...base,
			{ key: 'to',      label: 'To (phone number)', placeholder: '628123456789' },
			{ key: 'file',    label: 'File path', placeholder: '/path/to/file.jpg' },
			{ key: 'caption', label: 'Caption', optional: true },
		]
	})
	if (!result) return

	const isText = result.type === 'text'
	ctx.writeCommandArgs?.([
		{ key: 'type',    value: result.type },
		{ key: 'to',      value: result.to },
		{ key: isText ? 'message' : 'file', value: isText ? result.message : result.file },
		...(result.caption ? [{ key: 'caption', value: result.caption }] : []),
	])

	if (isText) {
		await execSendText(ctx, result.to, result.message)
	} else {
		await execSendMedia(ctx, result.to, result.file, result.caption || undefined, false)
	}
}

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
export async function sendTextHandler(ctx: CommandContext): Promise<void> {
	const [toArg, ...parts] = ctx.args
	const messageArg = parts.join(' ')

	if (toArg && messageArg) {
		await execSendText(ctx, toArg, messageArg)
		return
	}

	const result = await ctx.showForm?.('Send Text', [
		{ key: 'to',      label: 'To (phone number)', placeholder: '628123456789' },
		{ key: 'message', label: 'Message' },
	], { to: toArg, message: messageArg })
	if (!result) return

	ctx.writeCommandArgs?.([
		{ key: 'to',      value: result.to },
		{ key: 'message', value: result.message },
	])
	await execSendText(ctx, result.to, result.message)
}

/**
 * @param {CommandContext} ctx
 * @returns {Promise<void>}
 */
export async function sendMediaHandler(ctx: CommandContext): Promise<void> {
	const forceDocument = ctx.args.includes('--document')
	const cleanArgs = ctx.args.filter((a) => a !== '--document')
	const [toArg, fileArg, ...captionParts] = cleanArgs
	const captionArg = captionParts.join(' ')

	if (toArg && fileArg) {
		await execSendMedia(ctx, toArg, fileArg, captionArg || undefined, forceDocument)
		return
	}

	const result = await ctx.showForm?.('Send Media', [
		{ key: 'to',      label: 'To (phone number)', placeholder: '628123456789' },
		{ key: 'file',    label: 'File path', placeholder: '/path/to/file.jpg' },
		{ key: 'caption', label: 'Caption', optional: true },
	], { to: toArg, file: fileArg, caption: captionArg })
	if (!result) return

	ctx.writeCommandArgs?.([
		{ key: 'to',   value: result.to },
		{ key: 'file', value: result.file },
		...(result.caption ? [{ key: 'caption', value: result.caption }] : []),
	])
	await execSendMedia(ctx, result.to, result.file, result.caption || undefined, forceDocument)
}

registerCommand({ name: 'send',       usage: '',                             description: 'Send a message (guided)',  roles: ['client'], handler: sendHandler })
registerCommand({ name: 'send text',  usage: '[to] [message]',               params: ['to', 'message'],        description: 'Send a text message',     roles: ['client'], handler: sendTextHandler })
registerCommand({ name: 'send media', usage: '[to] [file] [caption]',        params: ['to', 'file', 'caption'], description: 'Send a media file',       roles: ['client'], handler: sendMediaHandler })
