import { tokenProvider } from './tokenProvider'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class AuthExpiredError extends Error {
  constructor() { super('Session expired') }
}

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

let acceptLanguageProvider: (() => string) | null = null

/** UI 언어를 서버에 전달한다. api 레이어가 i18n 을 직접 참조하지 않도록 composition root 에서 주입. */
export function setAcceptLanguageProvider(provider: (() => string) | null): void {
  acceptLanguageProvider = provider
}

export interface RequestOptions {
  signal?: AbortSignal
}

async function request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  const token = await tokenProvider.getToken()
  const acceptLanguage = acceptLanguageProvider?.()
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(acceptLanguage ? { 'Accept-Language': acceptLanguage } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  })

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.()
      throw new AuthExpiredError()
    }
    throw new Error(`API error: ${response.status}`)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
}
