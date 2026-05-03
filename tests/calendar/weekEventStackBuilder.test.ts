import { describe, it, expect } from 'vitest'
import { buildWeekEventStack, computeMoreEventCounts } from '../../src/calendar/weekEventStackBuilder'
import type { CalendarDay } from '../../src/calendar/calendarUtils'
import type { CalendarEvent } from '../../src/domain/functions/eventTime'
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

  // #104: 같은 시작일/같은 길이의 두 이벤트 중 "종일(allday)" 이벤트가 시간 이벤트보다 위 row 에 와야 한다.
  // iOS WeekEventStackBuilder.swift 정렬: length desc → eventRangesOnWeek.lowerBound asc.
  // allday 의 lowerBound 는 그 날 00:00 이라 시간 이벤트(예: 10:00)보다 작아 자연스럽게 우선.
  it('같은 날에 종일 이벤트와 시간 이벤트가 있으면 종일 이벤트가 위 row 에 배치된다 (#104)', () => {
    // given: 화요일에 종일 이벤트 "피부과 예약"(이름이 알파벳순으로 뒤) + 시간 이벤트 "A standup"
    const tueDateLocal = new Date(2026, 2, 3, 0, 0, 0, 0)
    const offsetSec = -tueDateLocal.getTimezoneOffset() * 60
    const tueStartTs = Math.floor(tueDateLocal.getTime() / 1000)
    const allday: CalendarEvent = {
      type: 'schedule',
      event: {
        uuid: 'allday',
        name: '피부과 예약',
        event_tag_id: null,
        event_time: {
          time_type: 'allday',
          period_start: tueStartTs,
          period_end: tueStartTs + 86400 - 1, // iOS endOfDay: 그 날 23:59:59
          seconds_from_gmt: offsetSec,
        },
      } as Schedule,
    }
    const timed: CalendarEvent = {
      type: 'schedule',
      event: {
        uuid: 'timed',
        name: 'A standup',
        event_tag_id: null,
        event_time: { time_type: 'at', timestamp: tueStartTs + 10 * 3600 }, // 화요일 10시
      } as Schedule,
    }
    const eventsByDate = new Map<string, CalendarEvent[]>([
      ['2026-03-03', [allday, timed]],
    ])

    // when
    const result = buildWeekEventStack(weekDays, eventsByDate)

    // then: 첫 row 에 종일 이벤트가 들어가야 한다 (이름 정렬에 휘둘리지 않음)
    expect(result.rows.length).toBe(2)
    expect(result.rows[0].some(e => e.event.event.uuid === 'allday')).toBe(true)
  })

  // #102: visibleRowCount 를 초과한 hidden row 들의 이벤트를 day(col) 별로 집계해
  // 각 day cell 위치에 "+N" 라벨을 표시하기 위한 헬퍼.
  describe('computeMoreEventCounts (#102)', () => {
    it('visible row count 가 stack.rows.length 이상이면 빈 배열을 반환한다', () => {
      // given: 1행 짜리 stack
      const ev = makeTodoEvent('t1', 'Solo')
      const eventsByDate = new Map<string, CalendarEvent[]>([['2026-03-03', [ev]]])
      const stack = buildWeekEventStack(weekDays, eventsByDate)

      // when / then
      expect(computeMoreEventCounts(stack, 5, 7)).toEqual([])
    })

    it('hidden row 안 이벤트가 차지하는 각 col 에 +1 씩 카운팅된다', () => {
      // given: 4행이 만들어지는 stack (모두 같은 화요일 col=3 에 4개 이벤트 → 4행)
      const ev1 = makeTodoEvent('t1', 'A')
      const ev2 = makeTodoEvent('t2', 'B')
      const ev3 = makeTodoEvent('t3', 'C')
      const ev4 = makeTodoEvent('t4', 'D')
      const eventsByDate = new Map<string, CalendarEvent[]>([
        ['2026-03-03', [ev1, ev2, ev3, ev4]], // Tue = col 3
      ])
      const stack = buildWeekEventStack(weekDays, eventsByDate)
      expect(stack.rows.length).toBe(4)

      // when: visible 2행만 → 2행 hidden, 각각 col 3 의 단일 이벤트
      const counts = computeMoreEventCounts(stack, 2, 7)

      // then: col 3 에 count 2
      expect(counts).toEqual([{ col: 3, count: 2 }])
    })

    it('multi-day 이벤트가 hidden 되면 걸친 모든 col 에 +1 씩 더해진다', () => {
      // given: 한 행에 multi-day(s1: col 2~5) 1개 — 다른 짧은 이벤트들로 이 multi-day 가 뒤로 밀려 hidden
      // 짧은 이벤트들이 stack 위에 오게 만들기 위해 단순히 day 별 다수 이벤트로 row 늘림
      const longEv = makeScheduleEvent('long', 'Multi-day')
      const shortA = makeTodoEvent('a', 'a')
      const shortB = makeTodoEvent('b', 'b')
      const shortC = makeTodoEvent('c', 'c')
      const eventsByDate = new Map<string, CalendarEvent[]>([
        ['2026-03-02', [longEv, shortA]],
        ['2026-03-03', [longEv, shortB]],
        ['2026-03-04', [longEv, shortC]],
        ['2026-03-05', [longEv]],
      ])
      const stack = buildWeekEventStack(weekDays, eventsByDate)
      // longEv 가 가장 긴 4-day span 이라 첫 row. 그러므로 visible=1 이면 short 들이 hidden.
      // hidden row 안의 1-day short 이벤트들이 각 col 에 표시되어야 한다.

      // when: 첫 row 만 visible
      const counts = computeMoreEventCounts(stack, 1, 7)

      // then: hidden row 들의 short 이벤트가 각 col 에 1씩 (단일 이벤트들은 startCol == endCol)
      const byCol = Object.fromEntries(counts.map(c => [c.col, c.count]))
      expect(byCol[2]).toBe(1) // shortA
      expect(byCol[3]).toBe(1) // shortB
      expect(byCol[4]).toBe(1) // shortC
    })
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

  // 이슈 #104 회귀 — 알고리즘(`fillRow`)의 col disjoint invariant 보장 검증.
  // 진짜 #104 fix 자체(CSS `gridRow: 1`)는 단위 테스트 영역 밖이지만, 본 describe 는
  // fillRow 가 향후 잘못 수정되어도 invariant 가 깨지지 않도록 회귀 방지를 담당.
  describe('이슈 #104 회귀 — fillRow invariant 보장', () => {
    const may3 = new Date(2026, 4, 3) // 2026-05-03 Sunday
    const may3Week = makeWeekDays(may3)

    // 사용자 화면 시나리오 fixture: cols 2-3 의 두 별개 chip(allday-3d-A, weekend-trip) +
    // cols 4-6 의 더 긴 chip(allday-3d-B) + 매일 반복 Daily meditation 7 turn.
    // turn 별 timestamp 차등 부여 — startTimestamp asc tiebreak 가 stable input order 에
    // 의존하지 않고 timestamp 자체로 결정되도록.
    const allDay3dA = makeScheduleEvent('allday-3d-A', '[TEST] AllDay 3d (yellow)')
    const allDay3dB = makeScheduleEvent('allday-3d-B', '[TEST] AllDay 3d (yellow)')
    const weekendTrip = makeScheduleEvent('weekend-trip', '[TEST] Weekend trip')
    const dailyTurn = (turn: number): CalendarEvent => ({
      type: 'schedule',
      event: {
        uuid: 'daily-meditation',
        name: '[TEST] Daily meditation',
        event_tag_id: null,
        event_time: { time_type: 'period', period_start: turn * 100, period_end: turn * 100 + 1800 },
        show_turns: [turn],
      } as Schedule,
    })

    function baseEventsByDate(): Map<string, CalendarEvent[]> {
      return new Map<string, CalendarEvent[]>([
        ['2026-05-03', [dailyTurn(1)]],                         // col 1
        ['2026-05-04', [allDay3dA, weekendTrip, dailyTurn(2)]], // col 2
        ['2026-05-05', [allDay3dA, weekendTrip, dailyTurn(3)]], // col 3
        ['2026-05-06', [allDay3dB, dailyTurn(4)]],              // col 4
        ['2026-05-07', [allDay3dB, dailyTurn(5)]],              // col 5
        ['2026-05-08', [allDay3dB, dailyTurn(6)]],              // col 6
        ['2026-05-09', [dailyTurn(7)]],                         // col 7
      ])
    }

    function findRowIndex(rows: ReturnType<typeof buildWeekEventStack>['rows'], uuid: string): number {
      return rows.findIndex(row => row.some(e => e.event.event.uuid === uuid))
    }

    function findOverlaps(rows: ReturnType<typeof buildWeekEventStack>['rows']): string[] {
      const violations: string[] = []
      rows.forEach((row, ri) => {
        for (let i = 0; i < row.length; i++) {
          for (let j = i + 1; j < row.length; j++) {
            const a = row[i]
            const b = row[j]
            if (a.startCol <= b.endCol && b.startCol <= a.endCol) {
              violations.push(
                `row ${ri}: ${a.event.event.name}[${a.startCol}-${a.endCol}] ↔ ${b.event.event.name}[${b.startCol}-${b.endCol}]`
              )
            }
          }
        }
      })
      return violations
    }

    it('같은 col 을 점유하는 두 별개 multi-day 이벤트는 다른 row 에 배치되어야 한다', () => {
      // when
      const result = buildWeekEventStack(may3Week, baseEventsByDate())

      // then: A 와 Weekend trip 이 같은 cols 2-3 → 다른 row 에 배치되어야 함
      const rowOfA = findRowIndex(result.rows, 'allday-3d-A')
      const rowOfWeekend = findRowIndex(result.rows, 'weekend-trip')
      expect(rowOfA).toBeGreaterThanOrEqual(0)
      expect(rowOfWeekend).toBeGreaterThanOrEqual(0)
      expect(rowOfA).not.toBe(rowOfWeekend)
    })

    it('같은 row 안 chip 들의 col 은 disjoint 해야 한다 (invariant)', () => {
      // when
      const result = buildWeekEventStack(may3Week, baseEventsByDate())

      // then: 모든 row 안 col 겹침 없음
      const violations = findOverlaps(result.rows)
      expect(violations, `invariant 위반:\n${violations.join('\n')}`).toEqual([])
    })

    it('시즈너 풀 데이터 + 두 AllDay 3d 인스턴스 — invariant 광범위 보장', () => {
      // given: testDataSeeder 의 5/3 시작 주에 들어오는 모든 chip 재현
      const offSiteDay = makeScheduleEvent('off-site', '[TEST] Off-site day')           // 5/3
      const designReview = makeScheduleEvent('design-review', '[TEST] Design review')    // 5/3
      const gymClass = makeScheduleEvent('gym-class', '[TEST] Gym class')                // 5/5
      const bookClub = makeScheduleEvent('book-club', '[TEST] Book club')                // 5/6
      const doctorVisit = makeScheduleEvent('doctor-visit', '[TEST] Doctor visit')       // 5/7
      const weeklyStandup = makeScheduleEvent('weekly-standup', '[TEST] Weekly standup') // 5/4
      const lunch = makeTodoEvent('lunch', '[TEST] Lunch with team')                     // 5/3
      const dinner = makeTodoEvent('dinner', '[TEST] Dinner prep')                       // 5/3
      const morningWorkout = (turn: number): CalendarEvent => ({
        type: 'todo',
        event: {
          uuid: 'morning-workout',
          name: '[TEST] Morning workout',
          is_current: false,
          event_tag_id: null,
          event_time: { time_type: 'at', timestamp: turn * 100 },
          repeating_turn: turn,
        } as Todo,
      })

      const eventsByDate = new Map<string, CalendarEvent[]>([
        ['2026-05-03', [offSiteDay, designReview, lunch, dinner, dailyTurn(1), morningWorkout(1)]],
        ['2026-05-04', [weekendTrip, weeklyStandup, allDay3dA, dailyTurn(2), morningWorkout(2)]],
        ['2026-05-05', [weekendTrip, gymClass, allDay3dA, dailyTurn(3), morningWorkout(3)]],
        ['2026-05-06', [bookClub, allDay3dB, dailyTurn(4), morningWorkout(4)]],
        ['2026-05-07', [doctorVisit, allDay3dB, dailyTurn(5), morningWorkout(5)]],
        ['2026-05-08', [allDay3dB, dailyTurn(6), morningWorkout(6)]],
        ['2026-05-09', [dailyTurn(7), morningWorkout(7)]],
      ])

      // when
      const result = buildWeekEventStack(may3Week, eventsByDate)

      // then: invariant 유지 + 같은 col 두 chip 은 서로 다른 row
      const violations = findOverlaps(result.rows)
      expect(violations, `invariant 위반:\n${violations.join('\n')}`).toEqual([])
      expect(findRowIndex(result.rows, 'allday-3d-A')).not.toBe(findRowIndex(result.rows, 'weekend-trip'))
    })

    it('AllDay 3d B(4-6) 가 있는 row 에 좌측 빈 영역(cols 1-3) 의 chip 도 같이 묶여야 한다', () => {
      // when
      const result = buildWeekEventStack(may3Week, baseEventsByDate())

      // then: greedy bin-packing 의 효율성 — B 만 단독으로 row 를 차지하지 않아야 함
      const rowOfB = result.rows.find(row =>
        row.some(e => e.event.event.uuid === 'allday-3d-B')
      )
      expect(rowOfB).toBeDefined()
      const otherInBRow = rowOfB!.filter(e => e.event.event.uuid !== 'allday-3d-B')
      expect(
        otherInBRow.length,
        `B(4-6) row 에 좌측(2-3) 또는 우측(7) chip 이 함께 들어가야 정상. 실제: ${rowOfB!.map(e => `${e.event.event.name}[${e.startCol}-${e.endCol}]`).join(', ')}`
      ).toBeGreaterThan(0)
    })
  })
})
