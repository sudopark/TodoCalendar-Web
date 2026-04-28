import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../../src/stores/authStore'

const authCallbackRef = vi.hoisted(() => ({ current: (_user: unknown) => {} }))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authCallbackRef.current = callback
    return () => {}
  }),
}))

vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

vi.mock('../../src/api/apiClient', () => ({
  apiClient: { put: vi.fn().mockResolvedValue({ uid: 'user-123' }) },
}))

describe('authStore', () => {
  beforeEach(async () => {
    useAuthStore.setState({ account: null, loading: true })
    vi.clearAllMocks()
    const { apiClient } = await import('../../src/api/apiClient')
    vi.mocked(apiClient.put).mockResolvedValue({ uid: 'user-123', email: 'test@example.com' })
  })

  describe('초기 상태', () => {
    it('인증 여부를 확인하는 동안 loading 상태이다', () => {
      expect(useAuthStore.getState().loading).toBe(true)
      expect(useAuthStore.getState().account).toBeNull()
    })
  })

  describe('인증 상태 동기화 (onAuthStateChanged)', () => {
    it('로그인된 사용자를 받으면 서버에서 계정 정보를 가져와 저장한다', async () => {
      // given / when
      await authCallbackRef.current({ uid: 'firebase-user' })

      // then
      const state = useAuthStore.getState()
      expect(state.account).toEqual({ uid: 'user-123', email: 'test@example.com' })
      expect(state.loading).toBe(false)
    })

    it('계정 등록 실패 시 account는 null이고 loading은 끝난다', async () => {
      // given
      const { apiClient } = await import('../../src/api/apiClient')
      vi.mocked(apiClient.put).mockRejectedValue(new Error('network error'))

      // when
      await authCallbackRef.current({ uid: 'firebase-user' })

      // then
      const state = useAuthStore.getState()
      expect(state.account).toBeNull()
      expect(state.loading).toBe(false)
    })

    it('미인증 상태를 받으면 account가 null이고 loading이 끝난다', async () => {
      // given / when
      await authCallbackRef.current(null)

      // then
      expect(useAuthStore.getState().account).toBeNull()
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  describe('setAccount', () => {
    it('setAccount 호출 시 account가 갱신된다', () => {
      // given
      const account = { uid: 'new-user', email: 'new@example.com' }

      // when
      useAuthStore.getState().setAccount(account)

      // then
      expect(useAuthStore.getState().account).toEqual(account)
    })

    it('setAccount(null) 호출 시 account가 null이 된다', () => {
      // given
      useAuthStore.setState({ account: { uid: 'u1' } })

      // when
      useAuthStore.getState().setAccount(null)

      // then
      expect(useAuthStore.getState().account).toBeNull()
    })
  })

  describe('reset', () => {
    it('reset 호출 시 account가 null이 되고 loading이 끝난다', () => {
      // given
      useAuthStore.setState({ account: { uid: 'u1', email: 'u1@example.com' }, loading: false })

      // when
      useAuthStore.getState().reset()

      // then
      expect(useAuthStore.getState().account).toBeNull()
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })
})
