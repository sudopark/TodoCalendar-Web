import { describe, it, expect } from 'vitest'
import {
  alldayWithStart,
  alldayWithEnd,
  nextEventTimeForType,
} from '../../../src/components/eventForm/EventTimePickerCore'
import type { EventTime } from '../../../src/models'

// #106: 종일-기간 이벤트가 캘린더에 단일(at) 로 표시되던 회귀.
// 원인은 EventTimePickerCore 의 allday 데이터 생성이 iOS EventTime.allDay 와 다른 포맷
// (period_x = ts - secondsFromGMT 트릭 + 새 생성 시 시작=종료=now) 으로 emit 되어
// alldayLocalDate(#103) 와 호환되지 않아 시작==종료 또는 1일 밀린 일자가 잡혔던 것.
//
// iOS 패턴: period_start = event tz 의 시작일 00:00 epoch, period_end = 종료일 23:59:59 epoch.
// (Calendar.endOfDay = 그 날 마지막 초)

function makeAllday(start: number, end: number, gmt: number): EventTime {
  return { time_type: 'allday', period_start: start, period_end: end, seconds_from_gmt: gmt }
}

describe('EventTimePickerCore — allday 데이터 생성 헬퍼 (#106)', () => {
  describe('alldayWithStart', () => {
    it('시작 날짜를 종료보다 앞 날짜로 바꾸면 종료는 보존된다', () => {
      // given: 5/15 ~ 5/17 종일 (사용자 환경 자정 epoch 가정)
      const prev = makeAllday(1000000, 1000000 + 3 * 86400 - 1, 9 * 3600)

      // when: 시작을 5/14 로 변경 (period_start - 86400)
      const newStart = prev.period_start - 86400
      const v = alldayWithStart(prev, newStart)

      // then: period_start 만 갱신, period_end 보존
      if (v.time_type !== 'allday') throw new Error('expected allday')
      expect(v.period_start).toBe(newStart)
      expect(v.period_end).toBe(prev.period_end)
    })

    it('시작 날짜를 종료보다 뒤로 바꾸면 종료가 시작 + 86400 - 1 (1일 종일) 로 정정된다', () => {
      // given: 5/15 (1일 종일)
      const prev = makeAllday(1000000, 1000000 + 86400 - 1, 9 * 3600)

      // when: 시작을 5/20 으로 (5일 뒤)
      const newStart = prev.period_start + 5 * 86400
      const v = alldayWithStart(prev, newStart)

      // then
      if (v.time_type !== 'allday') throw new Error('expected allday')
      expect(v.period_start).toBe(newStart)
      expect(v.period_end).toBe(newStart + 86400 - 1)
    })

    it('period_end 없는 allday(단일 일자 종일)는 시작 변경 후에도 period_end 가 undefined 를 유지한다 (#127)', () => {
      // given: period_end 없는 단일 일자 종일
      const prev = { time_type: 'allday' as const, period_start: 1000000, seconds_from_gmt: 9 * 3600 }

      // when: 시작을 임의 일자로 변경
      const newStart = prev.period_start + 5 * 86400
      const v = alldayWithStart(prev as EventTime, newStart)

      // then: period_end 는 여전히 undefined
      if (v.time_type !== 'allday') throw new Error('expected allday')
      expect(v.period_start).toBe(newStart)
      expect(v.period_end).toBeUndefined()
    })
  })

  describe('alldayWithEnd', () => {
    it('종료 날짜를 입력 날짜의 23:59:59 (그 날 자정 + 86400 - 1) 로 emit 한다', () => {
      // given: 5/15 (1일 종일)
      const prev = makeAllday(1000000, 1000000 + 86400 - 1, 9 * 3600)

      // when: 종료를 5/17 로 (= 시작 + 2일 후의 자정 epoch 입력)
      const newEndDateTs = prev.period_start + 2 * 86400  // 5/17 자정
      const v = alldayWithEnd(prev, newEndDateTs)

      // then: period_end = newEndDateTs + 86400 - 1 (= 5/17 23:59:59 epoch)
      expect(v).not.toBeNull()
      if (!v || v.time_type !== 'allday') throw new Error('expected allday')
      expect(v.period_end).toBe(newEndDateTs + 86400 - 1)
      expect(v.period_start).toBe(prev.period_start)
    })

    it('종료 날짜를 시작보다 앞으로 입력하면 null 을 반환한다 (변경 거부)', () => {
      // given: 5/15
      const prev = makeAllday(1000000, 1000000 + 86400 - 1, 9 * 3600)

      // when: 종료를 5/14 로 (시작 1일 전)
      const newEndDateTs = prev.period_start - 86400
      const v = alldayWithEnd(prev, newEndDateTs)

      // then
      expect(v).toBeNull()
    })
  })
})

// #108: 시간 타입(at/period/allday) 토글 시 기존 value 의 날짜가 손실되어 'now' 로 리셋되던 회귀.
// 폼 진입 시 selectedDate 로 at 이 세팅되어도, 사용자가 종일/주기 토글 → at 다시 선택 시
// 현재 시간 기준으로 timestamp 가 새로 잡혀 선택 날짜가 사라졌다.
//
// nextEventTimeForType 은 prev value 의 기준 timestamp 를 보존한다:
//   - prev=null  → now (기존 동작 유지)
//   - prev.at    → prev.timestamp
//   - prev.period→ prev.period_start
//   - prev.allday→ prev.period_start (이미 event tz 자정 epoch)
// allday 로 전환 시에는 baseTs 를 local 자정으로 정규화 (iOS startOfDay 패턴).

describe('nextEventTimeForType (#108) — 타입 변경 시 기존 날짜 보존', () => {
  const NOW = 1_700_000_000  // 임의 현재 시각 (테스트에서 baseTs 와 구분 가능한 값)
  const GMT = 9 * 3600

  describe('prev = null (값 없음)', () => {
    it('null → at 이면 now 기준 timestamp 로 시작한다', () => {
      const v = nextEventTimeForType(null, 'at', NOW, GMT)
      expect(v.time_type).toBe('at')
      if (v.time_type !== 'at') return
      expect(v.timestamp).toBe(NOW)
    })

    it('null → period 이면 now 기준 1시간 구간으로 시작한다', () => {
      const v = nextEventTimeForType(null, 'period', NOW, GMT)
      expect(v.time_type).toBe('period')
      if (v.time_type !== 'period') return
      expect(v.period_start).toBe(NOW)
      expect(v.period_end).toBe(NOW + 3600)
    })

    it('null → allday 이면 오늘(now 의 일자) 자정을 period_start 로, period_end 는 undefined(기본 OFF)로 시작한다 (#127)', () => {
      const v = nextEventTimeForType(null, 'allday', NOW, GMT)
      expect(v.time_type).toBe('allday')
      if (v.time_type !== 'allday') return
      const d = new Date(v.period_start * 1000)
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect(d.getSeconds()).toBe(0)
      expect(v.period_end).toBeUndefined()
      expect(v.seconds_from_gmt).toBe(GMT)
    })
  })

  describe('prev = at (선택 날짜 보존이 핵심)', () => {
    // NOW 와 다른 일자에 14:30 을 잡는다 — baseTs 가 now 가 아닌 prev 에서 왔는지 검증
    const selectedTs = (() => {
      const d = new Date(NOW * 1000)
      d.setMonth(d.getMonth() - 3)
      d.setDate(15)
      d.setHours(14, 30, 0, 0)
      return Math.floor(d.getTime() / 1000)
    })()
    const prevAt: EventTime = { time_type: 'at', timestamp: selectedTs }

    it('at → period 시 기존 timestamp 가 period_start 로 보존되고 종료는 +1시간', () => {
      const v = nextEventTimeForType(prevAt, 'period', NOW, GMT)
      expect(v.time_type).toBe('period')
      if (v.time_type !== 'period') return
      expect(v.period_start).toBe(selectedTs)
      expect(v.period_end).toBe(selectedTs + 3600)
    })

    it('at → allday 시 기존 timestamp 의 local 일자(자정) 이 period_start 가 되고 period_end 는 undefined(기본 OFF) (#127)', () => {
      const v = nextEventTimeForType(prevAt, 'allday', NOW, GMT)
      expect(v.time_type).toBe('allday')
      if (v.time_type !== 'allday') return
      const expectedStart = (() => {
        const d = new Date(selectedTs * 1000)
        d.setHours(0, 0, 0, 0)
        return Math.floor(d.getTime() / 1000)
      })()
      expect(v.period_start).toBe(expectedStart)
      expect(v.period_end).toBeUndefined()
      expect(v.seconds_from_gmt).toBe(GMT)
    })

    it('at → at 은 동일 timestamp 를 유지한다 (no-op 안전성)', () => {
      const v = nextEventTimeForType(prevAt, 'at', NOW, GMT)
      expect(v.time_type).toBe('at')
      if (v.time_type !== 'at') return
      expect(v.timestamp).toBe(selectedTs)
    })
  })

  describe('prev = period', () => {
    const periodStart = 1_690_000_000
    const prevPeriod: EventTime = { time_type: 'period', period_start: periodStart, period_end: periodStart + 1800 }

    it('period → at 시 period_start 가 timestamp 로 보존된다', () => {
      const v = nextEventTimeForType(prevPeriod, 'at', NOW, GMT)
      expect(v.time_type).toBe('at')
      if (v.time_type !== 'at') return
      expect(v.timestamp).toBe(periodStart)
    })

    it('period → allday 시 period_start 의 일자 자정이 새 period_start, period_end 는 undefined(기본 OFF) (#127)', () => {
      const v = nextEventTimeForType(prevPeriod, 'allday', NOW, GMT)
      expect(v.time_type).toBe('allday')
      if (v.time_type !== 'allday') return
      const expectedStart = (() => {
        const d = new Date(periodStart * 1000)
        d.setHours(0, 0, 0, 0)
        return Math.floor(d.getTime() / 1000)
      })()
      expect(v.period_start).toBe(expectedStart)
      expect(v.period_end).toBeUndefined()
    })
  })

  describe('prev = allday', () => {
    const alldayStart = 1_690_000_000
    const prevAllday: EventTime = {
      time_type: 'allday',
      period_start: alldayStart,
      period_end: alldayStart + 86400 - 1,
      seconds_from_gmt: GMT,
    }

    it('allday → at 시 period_start 가 timestamp 로 보존된다', () => {
      const v = nextEventTimeForType(prevAllday, 'at', NOW, GMT)
      expect(v.time_type).toBe('at')
      if (v.time_type !== 'at') return
      expect(v.timestamp).toBe(alldayStart)
    })

    it('allday → period 시 period_start 가 그대로 새 period_start, 종료는 +1시간', () => {
      const v = nextEventTimeForType(prevAllday, 'period', NOW, GMT)
      expect(v.time_type).toBe('period')
      if (v.time_type !== 'period') return
      expect(v.period_start).toBe(alldayStart)
      expect(v.period_end).toBe(alldayStart + 3600)
    })
  })
})
