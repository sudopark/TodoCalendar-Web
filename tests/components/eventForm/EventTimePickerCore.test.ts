import { describe, it, expect } from 'vitest'
import {
  newAlldayEventTime,
  alldayWithStart,
  alldayWithEnd,
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
  describe('newAlldayEventTime', () => {
    it('새로 만들면 시작은 사용자 환경의 오늘 자정, 종료는 시작 + 86400 - 1 (그 날 23:59:59) 이다', () => {
      // when
      const v = newAlldayEventTime(9 * 3600)

      // then
      expect(v.time_type).toBe('allday')
      if (v.time_type !== 'allday') return
      // 종료 - 시작 = 86400 - 1 (= 1일 종일, iOS endOfDay 패턴)
      expect(v.period_end - v.period_start).toBe(86400 - 1)
      // 시작은 자정 (Date 변환 시 hh:mm:ss 가 모두 0)
      const startDate = new Date(v.period_start * 1000)
      expect(startDate.getHours()).toBe(0)
      expect(startDate.getMinutes()).toBe(0)
      expect(startDate.getSeconds()).toBe(0)
      // secondsFromGmt 보존
      expect(v.seconds_from_gmt).toBe(9 * 3600)
    })
  })

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
