import axios from 'axios'
import { describe, expect, it } from 'vitest'
import { normalizeError, unwrap } from './client.js'

describe('normalizeError', () => {
  it('extracts status, code and message from axios error response', () => {
    const err = Object.assign(new axios.AxiosError('Request failed'), {
      response: {
        status: 401,
        data: { error: 'UNAUTHORIZED', message: 'Invalid credentials' },
      },
    })

    const result = normalizeError(err)

    expect(result.status).toBe(401)
    expect(result.code).toBe('UNAUTHORIZED')
    expect(result.message).toBe('Invalid credentials')
  })

  it('uses UNKNOWN code when error field missing', () => {
    const err = Object.assign(new axios.AxiosError('fail'), {
      response: { status: 500, data: { message: 'Internal error' } },
    })

    const result = normalizeError(err)

    expect(result.status).toBe(500)
    expect(result.code).toBe('UNKNOWN')
    expect(result.message).toBe('Internal error')
  })

  it('returns NETWORK_ERROR for non-axios errors', () => {
    const result = normalizeError(new Error('socket hang up'))

    expect(result.status).toBe(0)
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toContain('socket hang up')
  })

  it('handles axios error with no response (network failure)', () => {
    const err = new axios.AxiosError('Network Error')
    const result = normalizeError(err)

    expect(result.status).toBe(0)
    expect(result.code).toBe('UNKNOWN')
  })
})

describe('unwrap', () => {
  it('extracts data from success envelope', async () => {
    const fakePromise = Promise.resolve({ data: { success: true, data: { id: '123', name: 'test' } } })
    const result = await unwrap(fakePromise)

    expect(result).toEqual({ id: '123', name: 'test' })
  })

  it('propagates rejection', async () => {
    const fakePromise = Promise.reject(new Error('boom'))
    await expect(unwrap(fakePromise)).rejects.toThrow('boom')
  })
})
