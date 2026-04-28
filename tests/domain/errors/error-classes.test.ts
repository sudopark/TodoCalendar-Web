import { describe, it, expect } from 'vitest'
import { EventSaveError } from '../../../src/domain/errors/EventSaveError'
import { EventDeletionError } from '../../../src/domain/errors/EventDeletionError'
import { TagMutationError } from '../../../src/domain/errors/TagMutationError'
import { SettingsUpdateError } from '../../../src/domain/errors/SettingsUpdateError'
import { AuthError } from '../../../src/domain/errors/AuthError'

describe('도메인 에러 클래스', () => {
  it('EventSaveError 는 reason 객체를 보존하고 Error 인스턴스로 동작한다', () => {
    const err = new EventSaveError({ type: 'invalid_name' })
    expect(err.reason.type).toBe('invalid_name')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('EventSaveError')
  })

  it('EventDeletionError 는 reason 객체를 보존하고 Error 인스턴스로 동작한다', () => {
    const err = new EventDeletionError({ type: 'not_found' })
    expect(err.reason.type).toBe('not_found')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('EventDeletionError')
  })

  it('TagMutationError 는 reason 객체를 보존하고 Error 인스턴스로 동작한다', () => {
    const err = new TagMutationError({ type: 'duplicate_name' })
    expect(err.reason.type).toBe('duplicate_name')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('TagMutationError')
  })

  it('SettingsUpdateError 는 reason 객체를 보존하고 Error 인스턴스로 동작한다', () => {
    const err = new SettingsUpdateError({ type: 'invalid_value' })
    expect(err.reason.type).toBe('invalid_value')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('SettingsUpdateError')
  })

  it('AuthError 는 reason 객체를 보존하고 Error 인스턴스로 동작한다', () => {
    const err = new AuthError({ type: 'cancelled' })
    expect(err.reason.type).toBe('cancelled')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('AuthError')
  })
})
