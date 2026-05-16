import type { HolidayResponse } from '../models'
import type { LocalStorageContainer } from './local-storage/LocalStorageContainer'
import { useHolidayCache } from './caches/holidayCache'

// ── API 인터페이스 명시적 정의 ────────────────────────────────────────
// holidayApi 모듈의 실제 시그니처와 동기를 유지해야 한다.

export interface HolidayApi {
  getHolidays(year: number, locale: string, code: string): Promise<HolidayResponse>
}

export interface HolidayItem {
  summary: string
  date: string
}

interface Deps {
  api: HolidayApi
  initialLocale: string
  localStorageContainer?: LocalStorageContainer
}

export class HolidayRepository {
  private readonly api: HolidayApi
  private locale: string
  private readonly localStorageContainer: LocalStorageContainer | undefined
  // 동일 year 동시 fetch 시 같은 promise 를 공유해 API 트래픽을 1회로 줄인다 (#99).
  private readonly inFlight = new Map<number, Promise<void>>()

  constructor(deps: Deps) {
    this.api = deps.api
    this.locale = deps.initialLocale
    this.localStorageContainer = deps.localStorageContainer
  }

  setLocale(locale: string): void {
    this.locale = locale
  }

  // ── fetch: cache-first → 서버 → 캐시 ────────────────────────────

  async fetch(year: number): Promise<void> {
    const existing = this.inFlight.get(year)
    if (existing) return existing
    const promise = (async () => {
      const local = this.localStorageContainer

      // 1. Cache-first: LocalStorage 에 연도 데이터가 있으면 메모리에 즉시 반영
      if (local?.isInitialized()) {
        try {
          const cached = await local.holiday().loadYear(year)
          if (cached) {
            useHolidayCache.getState().setHolidaysForYear(year, cached)
          }
        } catch (e) {
          console.warn('LocalStorage holiday cache read 실패:', e)
        }
      }

      // 2. Remote: 서버 응답으로 메모리와 LocalStorage 를 최신화
      try {
        const { code } = useHolidayCache.getState().country
        const response = await this.api.getHolidays(year, this.locale, code)
        // 응답이 { items } 가 아닌 빈 객체로 오는 환경(예: 미모킹 단위 테스트)에도
        // setHolidaysForYear 가 unhandled rejection 을 일으키지 않도록 빈 배열 fallback.
        const items = response?.items ?? []
        useHolidayCache.getState().setHolidaysForYear(year, items)
        if (local?.isInitialized()) {
          try { await local.holiday().saveYear(year, items) } catch {}
        }
      } finally {
        this.inFlight.delete(year)
      }
    })()
    this.inFlight.set(year, promise)
    return promise
  }

  // ── observe: snapshot ────────────────────────────────────────────
  // 연도에 해당하는 공휴일 목록을 { summary, date } 형태로 반환한다.

  getHolidaysSnapshot(year: number): HolidayItem[] {
    const holidays = useHolidayCache.getState().holidays
    const result: HolidayItem[] = []
    for (const [dateKey, names] of holidays) {
      if (dateKey.startsWith(String(year))) {
        for (const summary of names) {
          result.push({ summary, date: dateKey })
        }
      }
    }
    return result
  }
}
