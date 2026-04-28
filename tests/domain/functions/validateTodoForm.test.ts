import { describe, it, expect } from 'vitest'
import { validateTodoForm } from '../../../src/domain/functions/validateTodoForm'
import type { EventTime } from '../../../src/models'

describe('validateTodoForm', () => {
  describe('이름 검증', () => {
    it('이름이 비어있으면 empty_name으로 ok=false 반환', () => {
      // given
      // when
      const result = validateTodoForm({ name: '' })
      // then
      expect(result).toEqual({ ok: false, reason: 'empty_name' })
    })

    it('이름이 공백만 있으면 empty_name으로 ok=false 반환', () => {
      // given
      // when
      const result = validateTodoForm({ name: '   ' })
      // then
      expect(result).toEqual({ ok: false, reason: 'empty_name' })
    })
  })

  describe('이름 있고 다른 필드 없는 경우', () => {
    it('이름이 있고 다른 필드 없으면 ok=true로 trimmed name을 input으로 반환', () => {
      // given
      // when
      const result = validateTodoForm({ name: '  할일  ' })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.input.name).toBe('할일')
        expect(result.input.event_time).toBeUndefined()
        expect(result.input.event_tag_id).toBeUndefined()
        expect(result.input.repeating).toBeUndefined()
        expect(result.input.notification_options).toBeUndefined()
      }
    })
  })

  describe('이벤트 시간 검증', () => {
    it('유효한 at 타입 event_time이 있으면 ok=true 반환', () => {
      // given
      const eventTime: EventTime = { time_type: 'at', timestamp: 1700000000 }
      // when
      const result = validateTodoForm({ name: '할일', eventTime })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.event_time).toEqual(eventTime)
    })

    it('period_start > period_end인 잘못된 period event_time이면 invalid_time으로 ok=false 반환', () => {
      // given
      const eventTime: EventTime = { time_type: 'period', period_start: 1700100000, period_end: 1700000000 }
      // when
      const result = validateTodoForm({ name: '할일', eventTime })
      // then
      expect(result).toEqual({ ok: false, reason: 'invalid_time' })
    })

    it('timestamp가 0인 at 타입 event_time이면 invalid_time으로 ok=false 반환', () => {
      // given
      const eventTime: EventTime = { time_type: 'at', timestamp: 0 }
      // when
      const result = validateTodoForm({ name: '할일', eventTime })
      // then
      expect(result).toEqual({ ok: false, reason: 'invalid_time' })
    })

    it('eventTime이 null이면 event_time 없이 ok=true 반환', () => {
      // given
      // when
      const result = validateTodoForm({ name: '할일', eventTime: null })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.event_time).toBeUndefined()
    })
  })

  describe('선택 필드 매핑', () => {
    it('eventTagId가 있으면 input.event_tag_id로 매핑된다', () => {
      // given
      // when
      const result = validateTodoForm({ name: '할일', eventTagId: 'tag-1' })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.event_tag_id).toBe('tag-1')
    })

    it('notifications가 빈 배열이면 notification_options가 undefined다', () => {
      // given
      // when
      const result = validateTodoForm({ name: '할일', notifications: [] })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.notification_options).toBeUndefined()
    })

    it('notifications가 있으면 notification_options로 매핑된다', () => {
      // given
      const notifications = [{ type: 'time' as const, seconds: 600 }]
      // when
      const result = validateTodoForm({ name: '할일', notifications })
      // then
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.input.notification_options).toEqual(notifications)
    })
  })
})
