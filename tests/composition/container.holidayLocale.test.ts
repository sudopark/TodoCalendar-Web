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

// holidayApi 의 getHolidays 로 실제 전달되는 locale 인자를 기록만 하는 stub (검증은 테스트가 직접).
// 응답 문구는 locale 에 따라 갈라 놓아, 재조회 여부를 호출 횟수가 아니라 캐시 문구로 확인할 수 있게 한다.
let capturedLocale: string | null = null
vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: {
    getHolidays: async (year: number, locale: string) => {
      capturedLocale = locale
      return {
        items: [
          {
            summary: locale === 'ko' ? '광복절' : 'Liberation Day',
            start: { date: `${year}-08-15` },
          },
        ],
      }
    },
  },
}))

import { loadLanguage } from '../../src/i18n'
import { repositories } from '../../src/composition/container'
import { useHolidayCache } from '../../src/repositories/caches/holidayCache'

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

  it('공휴일을 이미 받아둔 상태에서 언어를 바꾸면 해당 연도 문구가 새 언어로 갱신된다', async () => {
    // given — ko 로 2033년 공휴일을 받아둔 상태
    await loadLanguage('ko')
    await repositories.holidayRepo.fetch(2033)
    expect(useHolidayCache.getState().getHolidayNames('2033-08-15')).toEqual(['광복절'])

    // when — 화면 이동 없이 언어만 전환한다 (툴바 LanguagePicker 경로)
    await loadLanguage('en')

    // then — 이미 받아둔 연도가 새 언어 문구로 다시 채워진다
    await vi.waitFor(() =>
      expect(useHolidayCache.getState().getHolidayNames('2033-08-15')).toEqual(['Liberation Day']),
    )
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
