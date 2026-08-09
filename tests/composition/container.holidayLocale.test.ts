import { describe, it, expect, vi, afterEach } from 'vitest'

// container.ts → 각 Repository → 캐시 → api → Firebase 연쇄 초기화 차단 (RepositoriesProvider.test.tsx 와 동일 패턴)
vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))
vi.mock('../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../src/api/scheduleApi', () => ({ scheduleApi: {} }))
vi.mock('../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../src/api/foremostApi', () => ({ foremostApi: {} }))

// holidayApi 의 getHolidays 로 실제 전달되는 locale 인자를 기록만 하는 stub (검증은 테스트가 직접)
let capturedLocale: string | null = null
vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: {
    getHolidays: async (_year: number, locale: string) => {
      capturedLocale = locale
      return { items: [] }
    },
  },
}))

import { loadLanguage } from '../../src/i18n'
import { repositories } from '../../src/composition/container'

describe('container — 공휴일 API locale clamp', () => {
  afterEach(async () => {
    capturedLocale = null
    await loadLanguage('ko')
  })

  it('UI 언어가 ko/en 아닌 제3언어(zh-Hans 등)여도 공휴일 API 에는 en 으로 clamp 돼서 나간다', async () => {
    // given — UI 언어를 ko/en 이 아닌 언어로 전환 (Google 공휴일 캘린더 id 에 못 쓰는 태그)
    await loadLanguage('zh-Hans')

    // when
    await repositories.holidayRepo.fetch(2031)

    // then
    expect(capturedLocale).toBe('en')
  })

  it('UI 언어가 ko 면 공휴일 API 에도 ko 가 그대로 나간다', async () => {
    // given
    await loadLanguage('ko')

    // when
    await repositories.holidayRepo.fetch(2032)

    // then
    expect(capturedLocale).toBe('ko')
  })
})
