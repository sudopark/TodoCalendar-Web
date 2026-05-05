import { describe, it, expect } from 'vitest'
import { validateScheduleForm } from '../../../src/domain/functions/validateScheduleForm'
import type { EventTime } from '../../../src/models'

describe('validateScheduleForm', () => {
  const validEventTime: EventTime = { time_type: 'at', timestamp: 1700000000 }

  describe('이름 검증', () => {
    it('이름이 비어있으면 empty_name으로 ok=false 반환', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '', eventTime: validEventTime })
      // then
      expect(result).toEqual({ ok: false, reason: 'empty_name' })
    })

    it('이름이 공백만 있으면 empty_name으로 ok=false 반환', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '   ', eventTime: validEventTime })
      // then
      expect(result).toEqual({ ok: false, reason: 'empty_name' })
    })
  })

  describe('이벤트 시간 검증', () => {
    it('event_time이 null이면 missing_time으로 ok=false 반환', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '일정', eventTime: null })
      // then
      expect(result).toEqual({ ok: false, reason: 'missing_time' })
    })

    it('event_time이 undefined면 missing_time으로 ok=false 반환', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '일정' })
      // then
      expect(result).toEqual({ ok: false, reason: 'missing_time' })
    })

    it('period_start > period_end인 잘못된 period event_time이면 invalid_time으로 ok=false 반환', () => {
      // given
      const eventTime: EventTime = { time_type: 'period', period_start: 1700100000, period_end: 1700000000 }
      // when
      const result = validateScheduleForm({ name: '일정', eventTime })
      // then
      expect(result).toEqual({ ok: false, reason: 'invalid_time' })
    })

    it('timestamp가 0인 at 타입 event_time이면 invalid_time으로 ok=false 반환', () => {
      // given
      const eventTime: EventTime = { time_type: 'at', timestamp: 0 }
      // when
      const result = validateScheduleForm({ name: '일정', eventTime })
      // then
      expect(result).toEqual({ ok: false, reason: 'invalid_time' })
    })
  })

  describe('유효한 입력', () => {
    it('이름과 유효한 event_time이 있으면 ok=true로 input 반환', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '  회의  ', eventTime: validEventTime })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.input.name).toBe('회의')
        expect(result.input.event_time).toEqual(validEventTime)
        expect(result.input.event_tag_id).toBeUndefined()
        expect(result.input.notification_options).toBeUndefined()
      }
    })

    it('유효한 allday event_time이 있으면 ok=true 반환', () => {
      // given
      const eventTime: EventTime = { time_type: 'allday', period_start: 1700000000, period_end: 1700086400, seconds_from_gmt: 32400 }
      // when
      const result = validateScheduleForm({ name: '종일 일정', eventTime })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.event_time).toEqual(eventTime)
    })

    it('period_end 없는 allday(단일 일자 종일)도 valid로 판정한다 (#127)', () => {
      // given
      const eventTime: EventTime = { time_type: 'allday', period_start: 1700000000, seconds_from_gmt: 32400 } as any
      // when
      const result = validateScheduleForm({ name: '종일 일정', eventTime })
      // then
      expect(result.ok).toBe(true)
    })
  })

  describe('선택 필드 매핑', () => {
    it('eventTagId가 있으면 input.event_tag_id로 매핑된다', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '일정', eventTime: validEventTime, eventTagId: 'tag-2' })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.event_tag_id).toBe('tag-2')
    })

    it('notifications가 빈 배열이면 notification_options가 undefined다', () => {
      // given
      // when
      const result = validateScheduleForm({ name: '일정', eventTime: validEventTime, notifications: [] })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.notification_options).toBeUndefined()
    })

    it('notifications가 있으면 notification_options로 매핑된다', () => {
      // given
      const notifications = [{ type: 'time' as const, seconds: 300 }]
      // when
      const result = validateScheduleForm({ name: '일정', eventTime: validEventTime, notifications })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.notification_options).toEqual(notifications)
    })
  })
})
