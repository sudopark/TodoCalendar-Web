import { DateTime } from 'luxon'
import { Solar, Lunar } from 'lunar-javascript'
import type { EventTime, Repeating, RepeatingOption } from '../../models'
import type {
  EveryMonthDaysSelection,
  EveryMonthWeekSelection,
  WeekOrdinal,
} from '../../models'

// 반복 다음 차수(occurrence) 계산.
//
// iOS `EventRepeatTimeEnumerator.swift` 와 그걸 1:1 포팅한 서버
// (TodoCalendar-Functions `services/repeating/*`) 를 미러한 구현이다. 핵심은:
//   - 모든 날짜 산술을 이벤트의 timeZone 기준으로 (every_day 만 UTC) — 브라우저 로컬 TZ 무관
//   - exclude 회차는 turn 을 소비하지 않고 건너뛴다 (종료조건보다 먼저 판정)
//   - 음력은 실제 음력 변환 (lunar-javascript) — 양력 근사 아님
//
// weekday 컨벤션: 도메인은 0=일..6=토 (Date.getDay), API 경계(repeatingCodec)에서 서버 1-7 과 변환.
// 서버는 내부적으로 1-7 을 쓰지만 산술은 모듈러 차분이라 0-6 으로 일관되게 써도 동일하다.

export interface RepeatingTimes {
  time: EventTime
  turn: number
}

// --- public API ---

// excludeStartTimestamps: 제외할 occurrence 들의 시작 timestamp(epoch seconds) 배열.
// 서버 schema 와 동일 의미. turn 번호와 헷갈리지 말 것.
export function nextRepeatingTime(
  currentTime: EventTime,
  currentTurn: number,
  repeating: Repeating,
  excludeStartTimestamps?: number[],
): RepeatingTimes | null {
  return nextOccurrence(
    { time: currentTime, turn: currentTurn },
    repeating,
    toExcludeSet(excludeStartTimestamps),
    null,
  )
}

// 기간 내 모든 반복 인스턴스를 나열한다.
// startTime은 이미 알려진 첫 인스턴스이며, 그 다음 턴부터 rangeEnd(포함)까지 수집한다.
// startTime 자체는 반환값에 포함하지 않는다 — 호출자가 이미 가지고 있기 때문.
export function enumerateRepeatingTimes(
  startTime: EventTime,
  startTurn: number,
  repeating: Repeating,
  excludeStartTimestamps: number[] | undefined,
  rangeEnd: number,
): RepeatingTimes[] {
  const excludes = toExcludeSet(excludeStartTimestamps)
  const results: RepeatingTimes[] = []
  let cursor: RepeatingTimes = { time: startTime, turn: startTurn }
  for (;;) {
    const next = nextOccurrence(cursor, repeating, excludes, rangeEnd)
    if (next === null) break
    results.push(next)
    cursor = next
  }
  return results
}

export function shiftEventTime(time: EventTime, intervalSeconds: number): EventTime {
  switch (time.time_type) {
    case 'at':
      return { time_type: 'at', timestamp: time.timestamp + intervalSeconds }
    case 'period':
      return { time_type: 'period', period_start: time.period_start + intervalSeconds, period_end: time.period_end + intervalSeconds }
    case 'allday':
      return {
        time_type: 'allday',
        period_start: time.period_start + intervalSeconds,
        period_end: time.period_end != null ? time.period_end + intervalSeconds : undefined,
        seconds_from_gmt: time.seconds_from_gmt,
      }
  }
}

export function getStartTimestamp(time: EventTime): number {
  return lowerBound(time)
}

// --- core: 다음 occurrence 계산 (iOS nextEventTime 미러) ---

function nextOccurrence(
  from: RepeatingTimes,
  repeating: Repeating,
  excludes: Set<number>,
  // 조회 상한(seconds). null 이면 상한 없음.
  // display 용 window 라 occurrence '시작'(lowerBound) 기준으로 cap 한다 —
  // 경계에 걸친 multi-day 인스턴스도 호출처(eventTime.buildEventMap)에서 overlap 필터로 처리.
  // (repeating.end 는 도메인 종료일이라 서버처럼 upperBound 로 cap)
  rangeEnd: number | null,
): RepeatingTimes | null {
  let cursorTime = from.time
  for (;;) {
    const currentStart = lowerBound(cursorTime)
    const nextStart = nextStartByOption(repeating.option, currentStart)
    if (nextStart === null) return null
    // 전진 보장: 옵션 계산이 회귀/정체하면 무한루프(메인 스레드 hang) 대신 회차 종료로 degrade
    if (nextStart <= currentStart) return null

    const nextTime = shiftEventTime(cursorTime, nextStart - currentStart)

    // exclude 회차는 turn 미소비 — 종료조건보다 먼저 건너뛴다 (iOS 와 동일)
    if (excludes.has(lowerBound(nextTime))) {
      cursorTime = nextTime
      continue
    }

    if (repeating.end != null && upperBound(nextTime) > repeating.end) return null
    if (rangeEnd != null && lowerBound(nextTime) > rangeEnd) return null

    const next: RepeatingTimes = { time: nextTime, turn: from.turn + 1 }
    if (repeating.end_count != null && next.turn > repeating.end_count) return null
    return next
  }
}

function toExcludeSet(excludeStartTimestamps?: number[]): Set<number> {
  return new Set(excludeStartTimestamps ?? [])
}

function lowerBound(time: EventTime): number {
  return time.time_type === 'at' ? time.timestamp : time.period_start
}

function upperBound(time: EventTime): number {
  switch (time.time_type) {
    case 'at':
      return time.timestamp
    case 'period':
      return time.period_end
    case 'allday':
      return time.period_end ?? time.period_start
  }
}

// --- next start(seconds) by option (iOS nextEventDate 미러) ---

interface Current {
  dt: DateTime
  year: number
  month: number
  day: number
  weekday: number // 0=일..6=토
}

function zoneOf(option: RepeatingOption): string {
  // every_day 는 timeZone 필드가 없고 서버도 UTC 로 처리.
  if (option.optionType === 'every_day') return 'UTC'
  return option.timeZone || 'UTC'
}

function nextStartByOption(option: RepeatingOption, currentSec: number): number | null {
  const zone = zoneOf(option)
  const dt = DateTime.fromMillis(currentSec * 1000, { zone })
  const cur: Current = { dt, year: dt.year, month: dt.month, day: dt.day, weekday: appWeekday(dt) }

  let next: DateTime | null = null
  switch (option.optionType) {
    case 'every_day':
      next = dt.plus({ days: option.interval })
      break
    case 'every_week':
      next = nextEveryWeek(option.interval, option.dayOfWeek, cur)
      break
    case 'every_month':
      next =
        'days' in option.monthDaySelection
          ? nextEveryMonthDays(option.interval, option.monthDaySelection, cur)
          : nextEveryMonthWeek(option.interval, option.monthDaySelection, cur)
      break
    case 'every_year':
      next = nextEveryYear(option.interval, option.months, option.weekOrdinals, option.dayOfWeek, cur)
      break
    case 'every_year_some_day':
      next = dt.plus({ years: option.interval })
      break
    case 'lunar_calendar_every_year':
      return nextLunarYearSec(currentSec, zone)
  }
  // invalid DateTime 은 truthy 라 toMillis()=NaN → 조용히 깨질 수 있어 isValid 로 차단
  return next && next.isValid ? Math.round(next.toMillis() / 1000) : null
}

// --- date math helpers (luxon, zone-aware) — 서버 dateMath 미러 ---

// 앱 weekday: 일=0 ... 토=6 (Date.getDay). luxon weekday: 월=1 ... 일=7.
function appWeekday(dt: DateTime): number {
  return dt.weekday % 7
}

// 그 달에서 같은 요일의 서수(1-based). Foundation weekdayOrdinal.
function weekdayOrdinal(dt: DateTime): number {
  return Math.floor((dt.day - 1) / 7) + 1
}

// day를 세팅하되 그 달에 없는 일자(=clamp 발생)면 null.
function dateBySettingDay(dt: DateTime, day: number): DateTime | null {
  const r = dt.set({ day })
  return r.day === day ? r : null
}

// 그 달의 첫 번째 '해당 요일'(0-6). 원본 시각 유지.
function firstWeekday(dt: DateTime, appDay: number): DateTime {
  const firstWd = appWeekday(dt.startOf('month'))
  const daysToAdd = (appDay + 7 - firstWd) % 7
  return dt.set({ day: 1 + daysToAdd })
}

// 그 달의 마지막 '같은 요일'.
function lastOfSameWeekday(dt: DateTime): DateTime {
  const wd = appWeekday(dt)
  const lastDom = dt.endOf('month').startOf('day')
  const lastWd = appWeekday(lastDom)
  const daysToMinus = (lastWd - wd + 7) % 7
  return dt.set({ day: lastDom.day - daysToMinus })
}

// origin 에 src 의 시/분/초를 입힘.
function syncTimes(origin: DateTime, src: DateTime): DateTime {
  return origin.set({ hour: src.hour, minute: src.minute, second: src.second })
}

function ascending(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b)
}

// 배열에서 current 다음 요일/일자.
function nextGreater(sorted: number[], current: number): number | undefined {
  return sorted.find(v => v > current)
}

// --- every_week ---

function nextEveryWeek(interval: number, dayOfWeek: number[], cur: Current): DateTime | null {
  const days = ascending(dayOfWeek)
  const nx = nextGreater(days, cur.weekday)
  if (nx != null) return cur.dt.plus({ days: nx - cur.weekday })
  const first = days[0]
  if (first == null) return null
  return cur.dt.plus({ days: first - cur.weekday }).plus({ days: interval * 7 })
}

// --- every_month (days) ---

function nextEveryMonthDays(
  interval: number,
  selection: EveryMonthDaysSelection,
  cur: Current,
): DateTime | null {
  const days = ascending(selection.days)
  const nx = nextGreater(days, cur.day)
  if (nx != null) {
    const cand = dateBySettingDay(cur.dt, nx)
    if (cand) return cand
  }
  const first = days[0]
  if (first == null) return null
  // 다음 interval-달의 '첫 선택일'(days[0]) 을 앵커로. iOS findEventDateOnNextMonthFirstReaptingDay.
  const base = cur.dt.startOf('month').plus({ months: interval })
  return syncTimes(base.plus({ days: first - 1 }), cur.dt)
}

// --- every_month (week) ---

function nextEveryMonthWeek(
  interval: number,
  selection: EveryMonthWeekSelection,
  cur: Current,
): DateTime | null {
  const ordinals = selection.weekOrdinals
  const weekDays = ascending(selection.weekDays)
  const sameMonth = (cand: DateTime | null): boolean => cand != null && cand.month === cur.month

  const nx = nextGreater(weekDays, cur.weekday)
  if (nx != null) {
    const c = cur.dt.plus({ days: nx - cur.weekday })
    if (sameMonth(c)) return c
  }
  if (weekDays[0] != null) {
    const base = cur.dt.plus({ days: weekDays[0] - cur.weekday })
    const c = nextOrdinalDate(ordinals, base)
    if (sameMonth(c)) return c
  }
  const nextMonth = cur.dt.plus({ months: interval })
  const c = firstOrdinalAndWeekDay(ordinals[0], weekDays[0], nextMonth)
  if (c && c.month === nextMonth.month) return c
  return null
}

// --- every_year ---

function nextEveryYear(
  interval: number,
  months: number[],
  weekOrdinals: WeekOrdinal[],
  dayOfWeek: number[],
  cur: Current,
): DateTime | null {
  const sortedMonths = ascending(months)
  const days = ascending(dayOfWeek)
  const sameYear = (cand: DateTime | null): boolean => cand != null && cand.year === cur.year

  const nx = nextGreater(days, cur.weekday)
  if (nx != null) {
    const c = cur.dt.plus({ days: nx - cur.weekday })
    if (sameYear(c)) return c
  }
  if (days[0] != null) {
    const base = cur.dt.plus({ days: days[0] - cur.weekday })
    const c = nextOrdinalDate(weekOrdinals, base)
    if (c && c.month === cur.month && sameYear(c)) return c
  }
  const mi = nextMonthInterval(sortedMonths, cur.month)
  if (mi != null) {
    const nextMonth = cur.dt.plus({ months: mi })
    const c = firstOrdinalAndWeekDay(weekOrdinals[0], days[0], nextMonth)
    if (c && c.month === nextMonth.month && sameYear(c)) return c
  }
  const firstMonth = sortedMonths[0]
  const firstOrd = weekOrdinals[0]
  const firstWd = days[0]
  if (firstMonth == null || firstOrd == null || firstWd == null) return null
  const nextYearMonth = cur.dt.plus({ years: interval }).set({ month: firstMonth })
  const c = firstOrdinalAndWeekDay(firstOrd, firstWd, nextYearMonth)
  if (c && c.month === nextYearMonth.month) return c
  return null
}

function nextMonthInterval(sortedMonths: number[], currentMonth: number): number | null {
  const m = nextGreater(sortedMonths, currentMonth)
  return m == null ? null : m - currentMonth
}

// --- week ordinal helpers ---

// WeekOrdinal 배열에서 dt 기준 다음 ordinal 의 날짜.
function nextOrdinalDate(ordinals: WeekOrdinal[], dt: DateTime): DateTime | null {
  const ordinal = weekdayOrdinal(dt)
  for (const o of ordinals) {
    if (o.isLast) {
      const last = lastOfSameWeekday(dt)
      if (last && last.toMillis() > dt.toMillis()) return last
    } else if (o.seq != null && ordinal < o.seq) {
      return dt.plus({ days: (o.seq - ordinal) * 7 })
    }
  }
  return null
}

function ordinalValue(o: WeekOrdinal, dt: DateTime): number | null {
  if (o.isLast) {
    const last = lastOfSameWeekday(dt)
    return last ? weekdayOrdinal(last) : null
  }
  return o.seq ?? null
}

// 주어진 달의 첫 (서수, 요일) 날짜.
function firstOrdinalAndWeekDay(
  ordinal: WeekOrdinal | undefined,
  appWeekDay: number | undefined,
  monthDt: DateTime,
): DateTime | null {
  if (ordinal == null || appWeekDay == null) return null
  const firstWd = firstWeekday(monthDt, appWeekDay)
  const firstOrd = weekdayOrdinal(firstWd)
  const targetOrd = ordinalValue(ordinal, firstWd)
  if (targetOrd == null) return null
  return firstWd.plus({ days: (targetOrd - firstOrd) * 7 })
}

// --- lunar (서버 lunar/lunarYear 미러) ---

// 음력 (year, month, day) → 양력 Solar. lunar-javascript 는 윤달을 음수 month 로 표현하고,
// 대상 해에 같은 윤달이 없으면 throw 한다. 그 경우 평달(abs)로 fallback —
// Swift Calendar(.chinese) 의 윤달 clamp 와 동일한 의도.
function lunarToSolar(year: number, month: number, day: number) {
  const months = month < 0 ? [month, Math.abs(month)] : [month]
  for (const m of months) {
    try {
      return Lunar.fromYmd(year, m, day).getSolar()
    } catch {
      // 다음 month 후보로 진행
    }
  }
  return null
}

// currentSec 의 zone 기준 날짜 → 음력 변환 → 음력 해 +1 → 같은 음력 월/일 → 양력 초.
// 시/분/초 보존. resolve 불가면 null → 호출처는 회차 종료로 처리.
function nextLunarYearSec(currentSec: number, zone: string): number | null {
  const dt = DateTime.fromMillis(currentSec * 1000, { zone })
  const lunar = Solar.fromYmd(dt.year, dt.month, dt.day).getLunar()

  const nextSolar = lunarToSolar(lunar.getYear() + 1, lunar.getMonth(), lunar.getDay())
  if (nextSolar == null) return null

  const result = DateTime.fromObject(
    {
      year: nextSolar.getYear(),
      month: nextSolar.getMonth(),
      day: nextSolar.getDay(),
      hour: dt.hour,
      minute: dt.minute,
      second: dt.second,
    },
    { zone },
  )
  return Math.round(result.toMillis() / 1000)
}
