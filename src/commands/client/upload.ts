import { statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { uploadChunk, uploadComplete, uploadDirect, uploadInit } from '../../api/device.js'

export const CHUNK_SIZE = 2 * 1024 * 1024
export const DIRECT_MAX = 2 * 1024 * 1024

const MIME_BY_EXT: Record<string, string> = {
  // Image
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
  // Video
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska', '3gp': 'video/3gpp',
  // Audio
  mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4',
  wav: 'audio/wav', aac: 'audio/aac', flac: 'audio/flac',
  // Document
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv',
  zip: 'application/zip', rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
}

export function guessMime(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

export function getUploadStrategy(sizeBytes: number): 'direct' | 'chunked' {
  return sizeBytes <= DIRECT_MAX ? 'direct' : 'chunked'
}

export function splitIntoChunks(buffer: Buffer, chunkSize: number = CHUNK_SIZE): Buffer[] {
  const chunks: Buffer[] = []
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.subarray(i, i + chunkSize))
  }
  return chunks
}

export async function uploadFile(
  filePath: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const size = statSync(filePath).size
  const strategy = getUploadStrategy(size)

  const mimetype = guessMime(filePath)

  if (strategy === 'direct') {
    const result = await uploadDirect(filePath, mimetype)
    onProgress?.(100)
    return result.upload_id
  }

  const buffer = await readFile(filePath)
  const filename = basename(filePath)

  const { upload_id } = await uploadInit(filename, mimetype, size)
  const chunks = splitIntoChunks(buffer)

  for (let i = 0; i < chunks.length; i++) {
    await uploadChunk(upload_id, i, chunks[i])
    onProgress?.(Math.round(((i + 1) / chunks.length) * 100))
  }

  await uploadComplete(upload_id)
  return upload_id
}
