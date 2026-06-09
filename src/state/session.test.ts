import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  getRole,
  getSession,
  isAuthenticated,
  setSession,
} from './session.js'

describe('session', () => {
  beforeEach(() => {
    clearSession()
  })

  it('starts unauthenticated with empty credentials', () => {
    const s = getSession()
    expect(s.role).toBe('unauthenticated')
    expect(s.baseUrl).toBe('')
    expect(s.credentials).toEqual({})
  })

  it('setSession merges partial patch', () => {
    setSession({ baseUrl: 'http://localhost:3000' })
    expect(getSession().baseUrl).toBe('http://localhost:3000')
    expect(getSession().role).toBe('unauthenticated')
  })

  it('setSession updates role and credentials', () => {
    setSession({
      role: 'admin',
      baseUrl: 'http://api.test',
      credentials: { serviceKey: 'sk-abc', accessToken: 'at-xyz' },
    })

    const s = getSession()
    expect(s.role).toBe('admin')
    expect(s.credentials.serviceKey).toBe('sk-abc')
    expect(s.credentials.accessToken).toBe('at-xyz')
  })

  it('getRole returns current role', () => {
    expect(getRole()).toBe('unauthenticated')
    setSession({ role: 'client' })
    expect(getRole()).toBe('client')
  })

  it('isAuthenticated returns false when unauthenticated', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated returns true for admin and client', () => {
    setSession({ role: 'admin' })
    expect(isAuthenticated()).toBe(true)

    setSession({ role: 'client' })
    expect(isAuthenticated()).toBe(true)
  })

  it('clearSession resets to initial state', () => {
    setSession({ role: 'admin', baseUrl: 'http://x', credentials: { serviceKey: 'sk' } })
    clearSession()

    const s = getSession()
    expect(s.role).toBe('unauthenticated')
    expect(s.baseUrl).toBe('')
    expect(s.credentials).toEqual({})
  })
})
