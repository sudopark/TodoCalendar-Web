import type { CalendarDay } from './calendarUtils'
import type { CalendarEvent } from '../domain/functions/eventTime'

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
        })
      }
    }
  }

  if (eventMap.size === 0) return { rows: [] }

  // 정렬: 길이 desc → 시작일 asc → 이름 asc
  let remaining = Array.from(eventMap.values()).sort((a, b) => {
    if (b.spanLength !== a.spanLength) return b.spanLength - a.spanLength
    if (a.startCol !== b.startCol) return a.startCol - b.startCol
    return a.event.event.name.localeCompare(b.event.event.name)
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

  // 행 정렬: 총 커버 일수 desc → 첫 이벤트 시작일 asc
  rows.sort((a, b) => {
    const coverA = a.reduce((sum, e) => sum + (e.endCol - e.startCol + 1), 0)
    const coverB = b.reduce((sum, e) => sum + (e.endCol - e.startCol + 1), 0)
    if (coverB !== coverA) return coverB - coverA
    const firstStartA = Math.min(...a.map(e => e.startCol))
    const firstStartB = Math.min(...b.map(e => e.startCol))
    return firstStartA - firstStartB
  })

  return { rows }
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
