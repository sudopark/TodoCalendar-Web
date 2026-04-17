import { describe, it, expect } from 'vitest'
import { buildWeekEventStack } from '../../src/calendar/weekEventStackBuilder'
import type { CalendarDay } from '../../src/calendar/calendarUtils'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'

// Helper: 주어진 날짜 범위의 CalendarDay[] 생성 (일~토, 7일)
function makeWeekDays(startDate: Date): CalendarDay[] {
  const days: CalendarDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    days.push({
      date,
      dayOfMonth: date.getDate(),
      dateKey: `${y}-${m}-${d}`,
      isCurrentMonth: true,
      isToday: false,
    })
  }
  return days
}

// Helper: Todo CalendarEvent 생성
function makeTodoEvent(uuid: string, name: string, tagId?: string): CalendarEvent {
  return {
    type: 'todo',
    event: {
      uuid,
      name,
      is_current: false,
      event_tag_id: tagId ?? null,
      event_time: { time_type: 'at', timestamp: 0 },
    } as Todo,
  }
}

function makeScheduleEvent(uuid: string, name: string, tagId?: string): CalendarEvent {
  return {
    type: 'schedule',
    event: {
      uuid,
      name,
      event_tag_id: tagId ?? null,
      event_time: { time_type: 'at', timestamp: 0 },
    } as Schedule,
  }
}

// 2026-03-01 is a Sunday
const weekStart = new Date(2026, 2, 1) // Sun Mar 1
const weekDays = makeWeekDays(weekStart)

describe('buildWeekEventStack', () => {
  it('이벤트가 없는 주는 빈 rows를 반환한다', () => {
    // given: 빈 eventsByDate
    const eventsByDate = new Map<string, CalendarEvent[]>()

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then
    expect(result.rows).toEqual([])
  })

  it('단일 1일 이벤트는 1행 1이벤트로 배치된다', () => {
    // given: 화요일(col=3)에 이벤트 하나
    const ev = makeTodoEvent('t1', 'Buy milk')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-03', [ev]], // Tuesday = col 3
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 1행, startCol=3, endCol=3
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].length).toBe(1)
    expect(result.rows[0][0].startCol).toBe(3)
    expect(result.rows[0][0].endCol).toBe(3)
    expect(result.rows[0][0].event.event.uuid).toBe('t1')
  })

  it('다일 이벤트(월~수)는 1행에 startCol=2, endCol=4로 배치된다', () => {
    // given: 월~수에 걸치는 같은 이벤트
    const ev = makeScheduleEvent('s1', 'Conference')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-02', [ev]], // Mon = col 2
      ['2026-03-03', [ev]], // Tue = col 3
      ['2026-03-04', [ev]], // Wed = col 4
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 1행, span 2~4
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].length).toBe(1)
    expect(result.rows[0][0].startCol).toBe(2)
    expect(result.rows[0][0].endCol).toBe(4)
    expect(result.rows[0][0].event.event.uuid).toBe('s1')
  })

  it('겹치는 이벤트 2개는 서로 다른 행에 배치된다', () => {
    // given: 화요일에 2개의 서로 다른 이벤트
    const ev1 = makeTodoEvent('t1', 'Task A')
    const ev2 = makeTodoEvent('t2', 'Task B')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-03', [ev1, ev2]], // 둘 다 화요일
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 2행, 각각 1이벤트
    expect(result.rows.length).toBe(2)
    const allUuids = result.rows.map(row => row.map(e => e.event.event.uuid)).flat()
    expect(allUuids).toContain('t1')
    expect(allUuids).toContain('t2')
  })

  it('겹치지 않는 이벤트 2개는 같은 행에 배치된다', () => {
    // given: 월요일에 ev1, 금요일에 ev2 (겹치지 않음)
    const ev1 = makeTodoEvent('t1', 'Morning task')
    const ev2 = makeTodoEvent('t2', 'Evening task')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-02', [ev1]], // Mon = col 2
      ['2026-03-06', [ev2]], // Fri = col 6
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 1행에 2이벤트
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].length).toBe(2)
  })

  it('긴 이벤트가 먼저 배치되고, 짧은 이벤트가 빈 공간에 채워진다', () => {
    // given: 월~금 이벤트 + 토 이벤트
    const longEv = makeScheduleEvent('s1', 'Long event')
    const shortEv = makeTodoEvent('t1', 'Short event')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-02', [longEv]],           // Mon
      ['2026-03-03', [longEv]],           // Tue
      ['2026-03-04', [longEv]],           // Wed
      ['2026-03-05', [longEv]],           // Thu
      ['2026-03-06', [longEv]],           // Fri
      ['2026-03-07', [shortEv]],          // Sat
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 1행에 2이벤트 (긴 것 + 토요일 것), 긴 것이 먼저
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].length).toBe(2)
    // 긴 이벤트: col 2~6, 짧은 이벤트: col 7
    const sorted = [...result.rows[0]].sort((a, b) => a.startCol - b.startCol)
    expect(sorted[0].event.event.uuid).toBe('s1')
    expect(sorted[0].startCol).toBe(2)
    expect(sorted[0].endCol).toBe(6)
    expect(sorted[1].event.event.uuid).toBe('t1')
    expect(sorted[1].startCol).toBe(7)
    expect(sorted[1].endCol).toBe(7)
  })

  it('복잡한 케이스: 여러 이벤트가 올바르게 스택된다', () => {
    // given:
    //   A: 일~수 (col 1~4)
    //   B: 수~토 (col 4~7) — A와 수요일 겹침
    //   C: 금 (col 6) — B와 겹침
    //   D: 일 (col 1) — A와 겹침
    const evA = makeScheduleEvent('A', 'Event A')
    const evB = makeScheduleEvent('B', 'Event B')
    const evC = makeTodoEvent('C', 'Event C')
    const evD = makeTodoEvent('D', 'Event D')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-01', [evA, evD]],         // Sun: A, D
      ['2026-03-02', [evA]],              // Mon: A
      ['2026-03-03', [evA]],              // Tue: A
      ['2026-03-04', [evA, evB]],         // Wed: A, B
      ['2026-03-05', [evB]],              // Thu: B
      ['2026-03-06', [evB, evC]],         // Fri: B, C
      ['2026-03-07', [evB]],              // Sat: B
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: A(4일), B(4일)가 길어서 먼저 배치
    // A와 B는 수요일에 겹침 → 다른 행
    // D(1일)는 A와 일요일 겹침 → A와 다른 행, B와 겹치지 않으면 같은 행 가능? D는 col1, B는 col4~7 → 겹치지 않음 → B와 같은 행
    // C(1일)는 B와 금요일 겹침 → B와 다른 행, A와 겹치지 않으면 같은 행 가능? C는 col6, A는 col1~4 → 겹치지 않음 → A와 같은 행

    // 최소 2행
    expect(result.rows.length).toBeGreaterThanOrEqual(2)

    // 모든 이벤트가 포함되어야 함
    const allUuids = result.rows.flatMap(row => row.map(e => e.event.event.uuid))
    expect(allUuids).toContain('A')
    expect(allUuids).toContain('B')
    expect(allUuids).toContain('C')
    expect(allUuids).toContain('D')

    // A와 B는 같은 행에 있으면 안 됨 (겹침)
    const rowOfA = result.rows.findIndex(row => row.some(e => e.event.event.uuid === 'A'))
    const rowOfB = result.rows.findIndex(row => row.some(e => e.event.event.uuid === 'B'))
    expect(rowOfA).not.toBe(rowOfB)
  })

  it('동일 이벤트가 여러 날짜에 중복 등록되어도 uuid+turn 기준 dedup된다 (multi-day)', () => {
    // given: 같은 uuid + 같은 turn의 이벤트가 3일에 걸쳐 등록 (multi-day 이벤트)
    const ev = makeTodoEvent('t1', 'Duplicated')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-02', [ev]],
      ['2026-03-03', [ev]],
      ['2026-03-04', [ev]],
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 1개의 span으로 병합
    const allUuids = result.rows.flatMap(row => row.map(e => e.event.event.uuid))
    expect(allUuids.filter(u => u === 't1').length).toBe(1)
  })

  it('같은 uuid의 다른 turn 인스턴스들은 각각 별도로 표시된다', () => {
    // given: 같은 uuid의 반복 todo 인스턴스 3개 (turn 1, 2, 3)
    const makeTurn = (turn: number): CalendarEvent => ({
      type: 'todo',
      event: {
        uuid: 't1',
        name: 'Daily',
        is_current: false,
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 0 },
        repeating_turn: turn,
      } as Todo,
    })
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-02', [makeTurn(1)]],
      ['2026-03-03', [makeTurn(2)]],
      ['2026-03-04', [makeTurn(3)]],
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 3개의 별도 이벤트로 표시 (span 1씩)
    const flat = result.rows.flatMap(row => row)
    expect(flat).toHaveLength(3)
    expect(flat.every(e => e.event.event.uuid === 't1')).toBe(true)
    // 각 이벤트의 span이 1 (startCol === endCol)
    for (const e of flat) {
      expect(e.startCol).toBe(e.endCol)
    }
  })

  it('schedule 반복 인스턴스도 show_turns 기준으로 별도 표시된다', () => {
    // given
    const makeTurn = (turn: number): CalendarEvent => ({
      type: 'schedule',
      event: {
        uuid: 's1',
        name: 'Weekly',
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: 0 },
        show_turns: [turn],
      } as Schedule,
    })
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-02', [makeTurn(1)]],
      ['2026-03-05', [makeTurn(2)]],
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 2개의 별도 이벤트
    const flat = result.rows.flatMap(row => row)
    expect(flat).toHaveLength(2)
  })

  it('주 경계를 넘는 이벤트는 해당 주 범위로 클램핑된다', () => {
    // given: 이벤트가 이전 주부터 이번 주 화요일까지 걸쳐있지만
    //        eventsByDate에는 이번 주 날짜만 존재
    const ev = makeScheduleEvent('s1', 'Clamped event')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-01', [ev]], // Sun = col 1 (주 시작)
      ['2026-03-02', [ev]], // Mon = col 2
      ['2026-03-03', [ev]], // Tue = col 3
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: startCol=1, endCol=3
    expect(result.rows.length).toBe(1)
    expect(result.rows[0][0].startCol).toBe(1)
    expect(result.rows[0][0].endCol).toBe(3)
  })

  it('행 정렬: 커버하는 총 일수가 많은 행이 위에 온다', () => {
    // given:
    //   row1에 1일짜리 이벤트 2개 (총 2일 커버)
    //   row2에 5일짜리 이벤트 1개 (총 5일 커버)
    const short1 = makeTodoEvent('s1', 'Short 1')
    const short2 = makeTodoEvent('s2', 'Short 2')
    const long1 = makeScheduleEvent('l1', 'Long one')
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-01', [short1, long1]],  // Sun: short1, long1
      ['2026-03-02', [long1]],          // Mon
      ['2026-03-03', [long1]],          // Tue
      ['2026-03-04', [long1]],          // Wed
      ['2026-03-05', [long1]],          // Thu
      ['2026-03-07', [short2]],         // Sat: short2
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 긴 이벤트가 먼저 배치되므로 첫 행에 long1 포함
    const firstRowUuids = result.rows[0].map(e => e.event.event.uuid)
    expect(firstRowUuids).toContain('l1')
  })
})
