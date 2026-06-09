import axios, { type AxiosInstance } from 'axios'
import { getSession } from '../state/session.js'

export interface ApiError {
  status: number
  code: string
  message: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  message?: string
}

export function normalizeError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status ?? 0
    const body = e.response?.data as Record<string, unknown> | undefined
    return {
      status,
      code: (body?.error as string) ?? 'UNKNOWN',
      message: (body?.message as string) ?? e.message,
    }
  }
  return { status: 0, code: 'NETWORK_ERROR', message: String(e) }
}

// Session-aware client — reads current role + credentials on every call
export function getHttp(): AxiosInstance {
  const { baseUrl, role, credentials } = getSession()
  const headers: Record<string, string> = {}

  if (role === 'admin') {
    if (credentials.serviceKey) headers['X-Api-Key'] = credentials.serviceKey
    if (credentials.accessToken) headers['X-Access-Token'] = credentials.accessToken
  } else if (role === 'client') {
    if (credentials.deviceApiKey) headers['X-Api-Key'] = credentials.deviceApiKey
    if (credentials.deviceId) headers['X-Device-Id'] = credentials.deviceId
  }

  return axios.create({ baseURL: baseUrl, headers })
}

// One-off client for pre-auth requests (admin login)
export function makeHttp(baseUrl: string, headers: Record<string, string>): AxiosInstance {
  return axios.create({ baseURL: baseUrl, headers })
}

// Unwrap `{ success, data }` envelope
export async function unwrap<T>(
  promise: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  const res = await promise
  return res.data.data
}
