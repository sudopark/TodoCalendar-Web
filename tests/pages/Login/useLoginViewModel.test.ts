import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement } from 'react'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { useLoginViewModel } from '../../../src/pages/Login/useLoginViewModel'
import { AuthError } from '../../../src/domain/errors/AuthError'
import type { Repositories } from '../../../src/composition/container'

// ── Firebase / API 부수 초기화 차단 ─────────────────────────────────
vi.mock('../../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))
vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

// ── 불필요한 캐시 초기화 차단 ────────────────────────────────────────
vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))
vi.mock('../../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../../src/i18n', () => ({ default: { language: 'ko', on: vi.fn() } }))

// ── Fake AuthRepository ──────────────────────────────────────────────

function createFakeAuthRepo(overrides: {
  signInWithGoogle?: () => Promise<void>
  signInWithApple?: () => Promise<void>
} = {}) {
  return {
    signInWithGoogle: vi.fn(overrides.signInWithGoogle ?? (() => Promise.resolve())),
    signInWithApple: vi.fn(overrides.signInWithApple ?? (() => Promise.resolve())),
    signOut: vi.fn(() => Promise.resolve()),
  }
}

function createFakeRepos(authRepo: ReturnType<typeof createFakeAuthRepo>): Repositories {
  return { authRepo } as unknown as Repositories
}

function makeWrapper(repos: Repositories) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(RepositoriesProvider, { value: repos }, children)
  }
}

describe('useLoginViewModel', () => {
  describe('초기 상태', () => {
    it('loading은 false, errorKey는 null이다', () => {
      const authRepo = createFakeAuthRepo()
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )
      expect(result.current.loading).toBe(false)
      expect(result.current.errorKey).toBeNull()
    })
  })

  describe('signInWithGoogle', () => {
    it('성공 시 errorKey가 null로 유지된다', async () => {
      const authRepo = createFakeAuthRepo()
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.errorKey).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('AuthError(cancelled) 시 errorKey가 null로 유지된다', async () => {
      const authRepo = createFakeAuthRepo({
        signInWithGoogle: () => Promise.reject(new AuthError({ type: 'cancelled' })),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.errorKey).toBeNull()
    })

    it('auth/popup-closed-by-user 에러 시 errorKey가 null로 유지된다', async () => {
      const popupClosedError = Object.assign(new Error('popup closed'), {
        code: 'auth/popup-closed-by-user',
      })
      const authRepo = createFakeAuthRepo({
        signInWithGoogle: () => Promise.reject(popupClosedError),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.errorKey).toBeNull()
    })

    it('AuthError(network) 시 errorKey가 설정된다', async () => {
      const authRepo = createFakeAuthRepo({
        signInWithGoogle: () => Promise.reject(new AuthError({ type: 'network' })),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.errorKey).toBe('error.auth.network')
    })

    it('알 수 없는 에러 시 errorKey가 error.unknown으로 설정된다', async () => {
      const authRepo = createFakeAuthRepo({
        signInWithGoogle: () => Promise.reject(new Error('unknown')),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithGoogle()
      })

      expect(result.current.errorKey).toBe('error.unknown')
    })
  })

  describe('signInWithApple', () => {
    it('성공 시 errorKey가 null로 유지된다', async () => {
      const authRepo = createFakeAuthRepo()
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithApple()
      })

      expect(result.current.errorKey).toBeNull()
      expect(result.current.loading).toBe(false)
    })

    it('AuthError(cancelled) 시 errorKey가 null로 유지된다', async () => {
      const authRepo = createFakeAuthRepo({
        signInWithApple: () => Promise.reject(new AuthError({ type: 'cancelled' })),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithApple()
      })

      expect(result.current.errorKey).toBeNull()
    })

    it('알 수 없는 에러 시 errorKey가 error.unknown으로 설정된다', async () => {
      const authRepo = createFakeAuthRepo({
        signInWithApple: () => Promise.reject(new Error('unknown')),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithApple()
      })

      expect(result.current.errorKey).toBe('error.unknown')
    })
  })

  describe('dismissError', () => {
    it('errorKey가 있을 때 dismissError를 호출하면 null로 초기화된다', async () => {
      const authRepo = createFakeAuthRepo({
        signInWithGoogle: () => Promise.reject(new Error('unknown')),
      })
      const { result } = renderHook(
        () => useLoginViewModel(),
        { wrapper: makeWrapper(createFakeRepos(authRepo)) },
      )

      await act(async () => {
        await result.current.signInWithGoogle()
      })
      expect(result.current.errorKey).toBe('error.unknown')

      act(() => {
        result.current.dismissError()
      })

      expect(result.current.errorKey).toBeNull()
    })
  })
})
