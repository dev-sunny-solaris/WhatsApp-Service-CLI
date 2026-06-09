import { statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { uploadChunk, uploadComplete, uploadDirect, uploadInit } from '../../api/device.js'

export const CHUNK_SIZE = 2 * 1024 * 1024
export const DIRECT_MAX = 2 * 1024 * 1024

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4',
  pdf: 'application/pdf',
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
