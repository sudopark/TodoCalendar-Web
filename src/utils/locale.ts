export const DEFAULT_LOCALE = 'en'

function opts(base: Intl.DateTimeFormatOptions, timeZone?: string): Intl.DateTimeFormatOptions {
  return timeZone ? { ...base, timeZone } : base
}

export function formatTimeOfDay(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, opts({ hour: 'numeric', minute: '2-digit' }, timeZone)).format(date)
}

export function formatTimeRange(start: Date, end: Date, locale: string): string {
  return `${formatTimeOfDay(start, locale)} – ${formatTimeOfDay(end, locale)}`
}

export function formatMonthDay(date: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, opts({ month: 'short', day: 'numeric' }, timeZone)).format(date)
}

export function formatMonthLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
}

export function formatMonthYearLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

export function formatFullDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export function formatWeekdayLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
}

export function formatDateTimeMedium(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export function formatDateNumeric(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale).format(date)
}

// 2026-03-01(UTC) 이 일요일 — 요일 라벨 생성 기준 주
const WEEK_ANCHOR_UTC = Date.UTC(2026, 2, 1)

function weekdayLabels(locale: string, width: 'short' | 'long'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: width, timeZone: 'UTC' })
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(WEEK_ANCHOR_UTC + i * 86_400_000)))
}

export function weekdayShortLabels(locale: string, weekStartDay: number): string[] {
  const labels = weekdayLabels(locale, 'short')
  const start = ((weekStartDay % 7) + 7) % 7
  return [...labels.slice(start), ...labels.slice(0, start)]
}

export function weekdayLongLabels(locale: string): string[] {
  return weekdayLabels(locale, 'long')
}

// 러시아어·폴란드어·핀란드어 등은 일(day)과 결합될 때 월 이름이 격변화한다 (январь → января).
// 월 단독 포맷은 주격을 주므로, 날짜 문장에 끼워 넣을 이름은 일과 함께 포맷한 결과에서 뽑아야 한다.
export function monthNamesInDateContext(locale: string): string[] {
  const withDay = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const standalone = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(2026, i, 1))
    return withDay.formatToParts(date).find(p => p.type === 'month')?.value ?? standalone.format(date)
  })
}
