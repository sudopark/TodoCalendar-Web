import type { EventTime, Todo, Schedule } from '../../models'
import { enumerateRepeatingTimes } from './repeating'

export function eventTimeToStartDate(eventTime: EventTime): Date {
  switch (eventTime.time_type) {
    case 'at':
      return new Date(eventTime.timestamp * 1000)
    case 'period':
      return new Date(eventTime.period_start * 1000)
    case 'allday':
      return new Date((eventTime.period_start + eventTime.seconds_from_gmt) * 1000)
  }
}

export function eventTimeToEndDate(eventTime: EventTime): Date {
  switch (eventTime.time_type) {
    case 'at':
      return new Date(eventTime.timestamp * 1000)
    case 'period':
      return new Date(eventTime.period_end * 1000)
    case 'allday':
      return new Date((eventTime.period_end + eventTime.seconds_from_gmt) * 1000)
  }
}

export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function dayRange(date: Date): { lower: number; upper: number } {
  return {
    lower: dateToTimestamp(startOfDay(date)),
    upper: dateToTimestamp(endOfDay(date)),
  }
}

export function monthRange(year: number, month: number): { lower: number; upper: number } {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return {
    lower: dateToTimestamp(startOfDay(first)),
    upper: dateToTimestamp(endOfDay(last)),
  }
}

export function yearRange(year: number): { lower: number; upper: number } {
  const first = new Date(year, 0, 1)
  const last = new Date(year, 11, 31)
  return {
    lower: dateToTimestamp(startOfDay(first)),
    upper: dateToTimestamp(endOfDay(last)),
  }
}

export type CalendarEvent = { type: 'todo'; event: Todo } | { type: 'schedule'; event: Schedule }

export function eventTimeOverlapsRange(eventTime: EventTime, lower: number, upper: number): boolean {
  switch (eventTime.time_type) {
    case 'at':
      return eventTime.timestamp >= lower && eventTime.timestamp <= upper
    case 'period':
      return eventTime.period_start <= upper && eventTime.period_end >= lower
    case 'allday': {
      const adjStart = eventTime.period_start + eventTime.seconds_from_gmt
      const adjEnd = eventTime.period_end + eventTime.seconds_from_gmt
      return adjStart <= upper && adjEnd >= lower
    }
  }
}

export function groupEventsByDate(
  todos: Todo[],
  schedules: Schedule[],
  lower: number,
  upper: number,
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()

  const addToDate = (dateKey: string, event: CalendarEvent) => {
    const list = map.get(dateKey) ?? []
    list.push(event)
    map.set(dateKey, list)
  }

  // 단일 인스턴스(비반복 또는 반복의 한 turn)를 해당 기간 날짜들에 배치.
  // 이벤트의 실제 [start, end]가 [lower, upper]를 넘어가도 범위 밖 날짜에는 배치하지 않는다 — 호출자가 지정한 범위에만 책임진다.
  // 이게 안 지켜지면 다른 범위 fetch와 합쳐질 때 동일 날짜에 같은 이벤트가 여러 번 들어가 중복 노출 (#76).
  const lowerDate = new Date(lower * 1000)
  lowerDate.setHours(0, 0, 0, 0)
  const upperDate = new Date(upper * 1000)
  upperDate.setHours(0, 0, 0, 0)

  const assignInstance = (eventTime: EventTime, calEvent: CalendarEvent) => {
    if (!eventTimeOverlapsRange(eventTime, lower, upper)) return
    const start = eventTimeToStartDate(eventTime)
    const end = eventTimeToEndDate(eventTime)
    const current = new Date(Math.max(start.getTime(), lowerDate.getTime()))
    current.setHours(0, 0, 0, 0)
    const endDay = new Date(Math.min(end.getTime(), upperDate.getTime()))
    endDay.setHours(0, 0, 0, 0)
    while (current <= endDay) {
      const key = formatDateKey(current)
      addToDate(key, calEvent)
      current.setDate(current.getDate() + 1)
    }
  }

  // Todo는 반복이 있어도 한 번에 하나의 인스턴스(현재 turn)만 존재한다.
  // 완료/건너뛰기 시 서버가 다음 turn으로 이동시키므로 캘린더에는 현재 event_time에만 표시.
  for (const todo of todos) {
    if (!todo.event_time) continue
    assignInstance(todo.event_time, { type: 'todo', event: todo })
  }

  for (const schedule of schedules) {
    // Schedule의 event_time은 항상 반복 시리즈의 첫 인스턴스(turn 1) 시간이다.
    // 서버가 제공하는 show_turns는 기간 필터링 힌트이지 첫 turn을 의미하지 않는다.
    const FIRST_TURN = 1
    // 원본(첫 turn) 인스턴스 배치 — exclude 아닌 경우만
    if (!schedule.exclude_repeatings?.includes(FIRST_TURN)) {
      assignInstance(schedule.event_time, {
        type: 'schedule',
        event: { ...schedule, show_turns: [FIRST_TURN] },
      })
    }
    // 반복이 있으면 기간 내 나머지 인스턴스들 확장
    if (schedule.repeating) {
      const instances = enumerateRepeatingTimes(
        schedule.event_time,
        FIRST_TURN,
        schedule.repeating,
        schedule.exclude_repeatings ?? undefined,
        upper,
      )
      for (const inst of instances) {
        assignInstance(inst.time, {
          type: 'schedule',
          event: { ...schedule, event_time: inst.time, show_turns: [inst.turn] },
        })
      }
    }
  }

  return map
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
