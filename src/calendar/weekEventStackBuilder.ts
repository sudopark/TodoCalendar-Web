import type { CalendarDay } from './calendarUtils'
import type { CalendarEvent } from '../domain/functions/eventTime'
import { eventTimeToStartDate } from '../domain/functions/eventTime'

// 반복 이벤트의 각 인스턴스를 구분하기 위한 dedup 키.
// 같은 uuid의 multi-day 이벤트는 같은 turn을 가지므로 하나의 span으로 병합되고,
// 반복 이벤트의 서로 다른 턴은 별도의 인스턴스로 표시된다.
function dedupKey(calEvent: CalendarEvent): string {
  const uuid = calEvent.event.uuid
  const turn = calEvent.type === 'todo'
    ? calEvent.event.repeating_turn ?? 1
    : calEvent.event.show_turns?.[0] ?? 1
  return `${uuid}:${turn}`
}

export interface EventOnWeekRow {
  event: CalendarEvent
  startCol: number   // 1-based (1=일, 7=토)
  endCol: number     // 1-based, inclusive
}

export type EventRow = EventOnWeekRow[]

export interface WeekEventStack {
  rows: EventRow[]
}

interface DeduplicatedEvent {
  event: CalendarEvent
  startCol: number
  endCol: number
  spanLength: number
  startTimestamp: number  // 정렬 tie-break: 종일 이벤트(그 날 00:00)가 시간 이벤트보다 먼저 옴
}

// CalendarEvent 의 시작 timestamp (초). event_time 이 없으면 0.
function eventStartTs(calEvent: CalendarEvent): number {
  const t = calEvent.event.event_time
  if (!t) return 0
  return Math.floor(eventTimeToStartDate(t).getTime() / 1000)
}

/**
 * 주(week) 단위로 이벤트를 행에 스택하여 배치한다.
 *
 * 알고리즘:
 * 1. eventsByDate에서 해당 주에 걸치는 이벤트를 수집하고, uuid 기준으로 dedup
 * 2. 각 이벤트의 startCol/endCol 계산
 * 3. 길이(긴 것 우선) → 시작일 → 이름 순으로 정렬
 * 4. Greedy bin-packing: 가장 긴 이벤트를 행에 넣고, 좌/우 빈 공간에 맞는 이벤트를 재귀적으로 채움
 * 5. 행 정렬: 커버 일수 desc → 첫 이벤트 시작일 asc
 */
export function buildWeekEventStack(
  weekDays: CalendarDay[],
  eventsByDate: Map<string, CalendarEvent[]>,
): WeekEventStack {
  if (weekDays.length === 0) return { rows: [] }

  // dateKey → column index (1-based) 매핑
  const dateKeyToCol = new Map<string, number>()
  weekDays.forEach((day, i) => {
    dateKeyToCol.set(day.dateKey, i + 1)
  })

  // 이벤트 수집 + uuid+turn dedup + startCol/endCol 계산
  const eventMap = new Map<string, DeduplicatedEvent>()

  for (const day of weekDays) {
    const events = eventsByDate.get(day.dateKey) ?? []
    const col = dateKeyToCol.get(day.dateKey)!

    for (const ev of events) {
      const key = dedupKey(ev)
      const existing = eventMap.get(key)
      if (existing) {
        // 범위 확장
        existing.startCol = Math.min(existing.startCol, col)
        existing.endCol = Math.max(existing.endCol, col)
        existing.spanLength = existing.endCol - existing.startCol + 1
      } else {
        eventMap.set(key, {
          event: ev,
          startCol: col,
          endCol: col,
          spanLength: 1,
          startTimestamp: eventStartTs(ev),
        })
      }
    }
  }

  if (eventMap.size === 0) return { rows: [] }

  // 정렬: 길이 desc → 시작 column asc → 시작 timestamp asc (종일 이벤트가 시간 이벤트보다 먼저)
  // iOS WeekEventStackBuilder.sortUnStackedEvents 와 동일하게 length → lowerBound 우선.
  // 이름 정렬은 의도적으로 제외 — 알파벳에 따른 row 배치 흔들림(예: 종일 "피부과 예약"이 "A standup" 뒤로 밀림)을 방지.
  let remaining = Array.from(eventMap.values()).sort((a, b) => {
    if (b.spanLength !== a.spanLength) return b.spanLength - a.spanLength
    if (a.startCol !== b.startCol) return a.startCol - b.startCol
    return a.startTimestamp - b.startTimestamp
  })

  const rows: EventRow[] = []

  while (remaining.length > 0) {
    const row: EventOnWeekRow[] = []
    const usedKeys = new Set<string>()

    fillRow(remaining, row, usedKeys, 1, weekDays.length)

    // remaining에서 used 제거
    remaining = remaining.filter(e => !usedKeys.has(dedupKey(e.event)))

    rows.push(row)
  }

  // 행 정렬: 총 커버 일수 desc → 첫 이벤트 시작일 asc → 행 내 이벤트 개수 asc
  // iOS 정렬 (eventExistsLength desc, firstEventDaySequence asc, count asc) 와 동일.
  // count asc 가 있어야 "단일 긴 이벤트 row" 가 "여러 짧은 이벤트가 합쳐진 같은 cover row" 보다 위로 온다.
  rows.sort((a, b) => {
    const coverA = a.reduce((sum, e) => sum + (e.endCol - e.startCol + 1), 0)
    const coverB = b.reduce((sum, e) => sum + (e.endCol - e.startCol + 1), 0)
    if (coverB !== coverA) return coverB - coverA
    const firstStartA = Math.min(...a.map(e => e.startCol))
    const firstStartB = Math.min(...b.map(e => e.startCol))
    if (firstStartA !== firstStartB) return firstStartA - firstStartB
    return a.length - b.length
  })

  return { rows }
}

/**
 * visibleRowCount 를 초과해 잘려난 hidden row 들의 이벤트를 day(col) 별로 집계한다.
 * 캘린더 셀마다 그 날에 가려진 이벤트 수를 "+N" 라벨로 표시할 때 사용 (#102).
 *
 * @param stack buildWeekEventStack 결과
 * @param visibleRowCount 이 행 수까지만 표시되고, 그 이상의 행은 hidden 으로 간주
 * @param weekDayCount 주의 일수 (보통 7)
 * @returns col 오름차순으로 hidden 카운트가 0보다 큰 항목들
 */
export function computeMoreEventCounts(
  stack: WeekEventStack,
  visibleRowCount: number,
  weekDayCount: number,
): { col: number; count: number }[] {
  if (visibleRowCount >= stack.rows.length) return []
  const hiddenRows = stack.rows.slice(visibleRowCount)
  const counts = new Array(weekDayCount).fill(0) as number[]
  for (const row of hiddenRows) {
    for (const ev of row) {
      for (let c = ev.startCol; c <= ev.endCol; c++) {
        counts[c - 1] += 1
      }
    }
  }
  return counts
    .map((cnt, i) => ({ col: i + 1, count: cnt }))
    .filter(x => x.count > 0)
}

/**
 * 재귀적으로 행에 이벤트를 채운다.
 * rangeStart ~ rangeEnd 범위 내에서 가장 긴 이벤트를 배치하고,
 * 좌/우 빈 공간에 재귀적으로 더 채운다.
 */
function fillRow(
  candidates: DeduplicatedEvent[],
  row: EventOnWeekRow[],
  usedKeys: Set<string>,
  rangeStart: number,
  rangeEnd: number,
): void {
  if (rangeStart > rangeEnd) return

  // 범위 내에 맞는 이벤트 중 가장 긴 것 찾기
  const fitting = candidates.filter(
    e => e.startCol >= rangeStart && e.endCol <= rangeEnd
      && !usedKeys.has(dedupKey(e.event))
  )

  if (fitting.length === 0) return

  // 이미 정렬되어 있으므로 첫 번째가 가장 긴 것
  const best = fitting[0]

  row.push({
    event: best.event,
    startCol: best.startCol,
    endCol: best.endCol,
  })
  usedKeys.add(dedupKey(best.event))

  // 왼쪽 빈 공간
  if (best.startCol > rangeStart) {
    fillRow(candidates, row, usedKeys, rangeStart, best.startCol - 1)
  }

  // 오른쪽 빈 공간
  if (best.endCol < rangeEnd) {
    fillRow(candidates, row, usedKeys, best.endCol + 1, rangeEnd)
  }
}
