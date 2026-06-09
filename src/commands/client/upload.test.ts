import { describe, expect, it } from 'vitest'
import { getUploadStrategy, guessMime, splitIntoChunks, CHUNK_SIZE, DIRECT_MAX } from './upload.js'

describe('getUploadStrategy', () => {
  it('returns direct for files at the limit', () => {
    expect(getUploadStrategy(DIRECT_MAX)).toBe('direct')
  })

  it('returns direct for small files', () => {
    expect(getUploadStrategy(1024)).toBe('direct')
  })

  it('returns chunked for files above limit', () => {
    expect(getUploadStrategy(DIRECT_MAX + 1)).toBe('chunked')
  })
})

describe('guessMime', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['image.png', 'image/png'],
    ['clip.mp4', 'video/mp4'],
    ['audio.mp3', 'audio/mpeg'],
    ['doc.pdf', 'application/pdf'],
    ['archive.zip', 'application/octet-stream'],
    ['noextension', 'application/octet-stream'],
  ])('%s → %s', (filename, expected) => {
    expect(guessMime(filename)).toBe(expected)
  })
})

describe('splitIntoChunks', () => {
  it('returns single chunk when buffer fits in one chunk', () => {
    const buf = Buffer.alloc(1024)
    const chunks = splitIntoChunks(buf, CHUNK_SIZE)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].length).toBe(1024)
  })

  it('splits buffer into correct number of chunks', () => {
    const chunkSize = 100
    const buf = Buffer.alloc(250)
    const chunks = splitIntoChunks(buf, chunkSize)
    expect(chunks).toHaveLength(3)
    expect(chunks[0].length).toBe(100)
    expect(chunks[1].length).toBe(100)
    expect(chunks[2].length).toBe(50)
  })

  it('handles exact multiple of chunk size', () => {
    const chunkSize = 100
    const buf = Buffer.alloc(200)
    expect(splitIntoChunks(buf, chunkSize)).toHaveLength(2)
  })

  it('returns empty array for empty buffer', () => {
    expect(splitIntoChunks(Buffer.alloc(0))).toHaveLength(0)
  })
})
