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
