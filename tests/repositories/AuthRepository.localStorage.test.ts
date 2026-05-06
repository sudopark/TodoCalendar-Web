import { describe, it, expect, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

import { AuthRepository, type AuthFirebaseApi } from '../../src/repositories/AuthRepository'
import { LocalStorageContainer } from '../../src/repositories/local-storage/LocalStorageContainer'
import type { Todo } from '../../src/models/Todo'
import type { HolidayItem } from '../../src/models/Holiday'

const fakeApi: AuthFirebaseApi = {
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
}

const TEST_UID = 'wipe-test-uid'

async function deleteDb(uid: string) {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(`todocal-cache:${uid}`)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

const sampleTodo: Todo = {
  uuid: 'a',
  name: 't',
  is_current: true,
  event_tag_id: null,
  event_time: { time_type: 'at', timestamp: 100 },
  repeating: null,
  notification_options: null,
} as Todo

const sampleHoliday: HolidayItem = {
  summary: '신정',
  start: { date: '2025-01-01' },
  end: { date: '2025-01-02' },
}

describe('AuthRepository.signOut + LocalStorage wipe', () => {
  it('init 된 컨테이너의 user store 데이터를 비우고, holidays 는 보존한다', async () => {
    // given
    const container = new LocalStorageContainer()
    await container.init(TEST_UID)
    await container.todo().saveTodos([sampleTodo])
    await container.holiday().saveYear(2025, [sampleHoliday])

    const repo = new AuthRepository({ api: fakeApi, localStorageContainer: container })

    // when
    await repo.signOut()

    // then
    expect(await container.todo().loadCurrentTodos()).toEqual([])
    expect(await container.holiday().loadYear(2025)).not.toBeNull()

    await container.dispose()
    await deleteDb(TEST_UID)
  })

  it('init 안 된 컨테이너에서도 signOut 은 에러 없이 끝난다', async () => {
    const container = new LocalStorageContainer()
    const repo = new AuthRepository({ api: fakeApi, localStorageContainer: container })
    await expect(repo.signOut()).resolves.toBeUndefined()
  })

  it('localStorageContainer 가 주입되지 않은 AuthRepository 도 기존처럼 동작한다 (호환성)', async () => {
    const repo = new AuthRepository({ api: fakeApi })
    await expect(repo.signOut()).resolves.toBeUndefined()
  })

  it('signOut 중 dispose() 가 호출되어 session 이 null 이 되어도 wipe 는 이미 완료된다', async () => {
    // given: container 를 init 하고 todo 저장
    const container = new LocalStorageContainer()
    await container.init(TEST_UID + '-race')
    await container.todo().saveTodos([sampleTodo])

    // signOut API 에서 dispose 를 시뮬레이션 — wipe 가 FIRST 면 이미 끝난 상태
    const disposeRacingApi: AuthFirebaseApi = {
      signInWithGoogle: async () => {},
      signInWithApple: async () => {},
      signOut: async () => {
        // AuthGuard unmount 가 dispose 를 부르는 상황 시뮬레이션
        await container.dispose()
      },
    }
    const repo = new AuthRepository({ api: disposeRacingApi, localStorageContainer: container })

    // when
    await repo.signOut()

    // then: wipe 는 signOut API 보다 먼저 실행되므로 이미 비워진 상태
    // container 가 dispose 되었으므로 재확인을 위해 새 연결로 검증
    const verifyContainer = new LocalStorageContainer()
    await verifyContainer.init(TEST_UID + '-race')
    try {
      expect(await verifyContainer.todo().loadCurrentTodos()).toEqual([])
    } finally {
      await verifyContainer.dispose()
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(`todocal-cache:${TEST_UID}-race`)
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      })
    }
  })
})
