import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

import { AuthRepository } from '../../src/repositories/AuthRepository'
import { useAuthStore } from '../../src/stores/authStore'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useForemostEventCache } from '../../src/repositories/caches/foremostEventCache'
import { useCalendarEventsCache } from '../../src/repositories/caches/calendarEventsCache'
import { useDoneTodosCache } from '../../src/repositories/caches/doneTodosCache'
import type { AuthFirebaseApi } from '../../src/repositories/AuthRepository'
import type { Account } from '../../src/stores/authStore'

// ──────────────────────── helpers ────────────────────────

function makeAccount(uid = 'user-123'): Account {
  return { uid, email: `${uid}@example.com`, method: 'google' }
}

function makeFakeFirebaseApi(overrides: Partial<AuthFirebaseApi> = {}): AuthFirebaseApi {
  return {
    signInWithGoogle: overrides.signInWithGoogle ?? vi.fn(async () => {}),
    signInWithApple: overrides.signInWithApple ?? vi.fn(async () => {}),
    signOut: overrides.signOut ?? vi.fn(async () => {}),
  }
}

// ──────────────────────── signInWithGoogle ────────────────────────

describe('AuthRepository — signInWithGoogle', () => {
  beforeEach(() => {
    useAuthStore.setState({ account: null, loading: false })
  })

  it('Google 로그인 성공 시 에러 없이 완료된다', async () => {
    // given
    const api = makeFakeFirebaseApi({ signInWithGoogle: vi.fn(async () => {}) })
    const repo = new AuthRepository({ api })

    // when / then
    await expect(repo.signInWithGoogle()).resolves.toBeUndefined()
  })

  it('Google 로그인 실패 시 에러가 전파된다', async () => {
    // given
    const api = makeFakeFirebaseApi({
      signInWithGoogle: vi.fn(async () => { throw new Error('popup-closed') }),
    })
    const repo = new AuthRepository({ api })

    // when / then
    await expect(repo.signInWithGoogle()).rejects.toThrow('popup-closed')
  })
})

// ──────────────────────── signInWithApple ────────────────────────

describe('AuthRepository — signInWithApple', () => {
  beforeEach(() => {
    useAuthStore.setState({ account: null, loading: false })
  })

  it('Apple 로그인 성공 시 에러 없이 완료된다', async () => {
    // given
    const api = makeFakeFirebaseApi({ signInWithApple: vi.fn(async () => {}) })
    const repo = new AuthRepository({ api })

    // when / then
    await expect(repo.signInWithApple()).resolves.toBeUndefined()
  })

  it('Apple 로그인 실패 시 에러가 전파된다', async () => {
    // given
    const api = makeFakeFirebaseApi({
      signInWithApple: vi.fn(async () => { throw new Error('auth/cancelled') }),
    })
    const repo = new AuthRepository({ api })

    // when / then
    await expect(repo.signInWithApple()).rejects.toThrow('auth/cancelled')
  })
})

// ──────────────────────── signOut ────────────────────────

describe('AuthRepository — signOut', () => {
  beforeEach(() => {
    useAuthStore.setState({ account: makeAccount(), loading: false })
    // 캐시에 데이터 세팅
    useEventTagListCache.setState({
      tags: new Map([['t1', { uuid: 't1', name: 'tag', color_hex: '#ff0000' }]]),
    })
    useCurrentTodosCache.setState({
      todos: [{ uuid: 'td1', name: 'todo', is_current: true, event_time: null }],
    })
    useForemostEventCache.setState({ foremostEvent: { event_id: 'e1', is_todo: true } as never })
    useCalendarEventsCache.setState({
      eventsByDate: new Map([['2025-01-01', []]]),
      lastRange: { lower: 0, upper: 100 },
    })
    useDoneTodosCache.setState({
      items: [{ uuid: 'd1', name: 'done', done_at: 1000, origin_event_id: null, event_time: null, event_tag_id: null }],
      cursor: 1000,
      hasMore: false,
    })
  })

  it('로그아웃 후 authStore의 account가 null이 된다', async () => {
    // given
    const repo = new AuthRepository({ api: makeFakeFirebaseApi() })

    // when
    await repo.signOut()

    // then
    expect(useAuthStore.getState().account).toBeNull()
  })

  it('로그아웃 시 모든 데이터 캐시가 초기화된다', async () => {
    // given
    const repo = new AuthRepository({ api: makeFakeFirebaseApi() })

    // when
    await repo.signOut()

    // then
    expect(useEventTagListCache.getState().tags.get('t1')).toBeUndefined()
    expect(useCurrentTodosCache.getState().todos).toEqual([])
    expect(useForemostEventCache.getState().foremostEvent).toBeNull()
    expect(useCalendarEventsCache.getState().eventsByDate.size).toBe(0)
    expect(useDoneTodosCache.getState().items).toEqual([])
  })

  it('Firebase signOut이 실패해도 로컬 캐시는 초기화된다', async () => {
    // given: Firebase signOut 실패
    const api = makeFakeFirebaseApi({
      signOut: vi.fn(async () => { throw new Error('network error') }),
    })
    const repo = new AuthRepository({ api })

    // when: signOut 호출 — 에러를 삼키고 로컬 정리 진행
    await repo.signOut()

    // then: 캐시는 초기화됨
    expect(useAuthStore.getState().account).toBeNull()
    expect(useCurrentTodosCache.getState().todos).toEqual([])
  })
})
