import type { HolidayResponse } from '../models'
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
}

export class HolidayRepository {
  private readonly api: HolidayApi
  private locale: string

  constructor(deps: Deps) {
    this.api = deps.api
    this.locale = deps.initialLocale
  }

  setLocale(locale: string): void {
    this.locale = locale
  }

  // ── fetch: 서버 → 캐시 ────────────────────────────────────────────

  async fetch(year: number): Promise<void> {
    const { code } = useHolidayCache.getState().country
    const response = await this.api.getHolidays(year, this.locale, code)
    // 응답이 { items } 가 아닌 빈 객체로 오는 환경(예: 미모킹 단위 테스트)에도
    // setHolidaysForYear 가 unhandled rejection 을 일으키지 않도록 빈 배열 fallback.
    useHolidayCache.getState().setHolidaysForYear(year, response?.items ?? [])
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
