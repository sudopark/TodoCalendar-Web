import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEventFormDirty, type EventFormSnapshot } from '../../src/hooks/useEventFormDirty'

const base: EventFormSnapshot = {
  name: 'A',
  tagId: null,
  eventTime: null,
  repeating: null,
  notifications: [],
  place: '',
  url: '',
  memo: '',
}

describe('useEventFormDirty', () => {
  it('원본이 null이면 dirty는 true다 (신규 모드)', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(null, base))
    // then
    expect(result.current).toBe(true)
  })

  it('원본과 현재가 동일하면 dirty는 false다', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(base, base))
    // then
    expect(result.current).toBe(false)
  })

  it('name이 변경되면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(base, { ...base, name: 'B' }))
    // then
    expect(result.current).toBe(true)
  })

  it('place가 변경되면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(base, { ...base, place: '강남역' }))
    // then
    expect(result.current).toBe(true)
  })

  it('notifications 배열 값이 달라지면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() =>
      useEventFormDirty(base, { ...base, notifications: [{ type: 'time', seconds: 300 }] })
    )
    // then
    expect(result.current).toBe(true)
  })

  it('repeating이 null↔객체로 바뀌면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() =>
      useEventFormDirty(base, {
        ...base,
        repeating: { start: 1743375600, option: { optionType: 'every_week', interval: 1 } },
      })
    )
    // then
    expect(result.current).toBe(true)
  })

  it('url이 변경되면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(base, { ...base, url: 'https://example.com' }))
    // then
    expect(result.current).toBe(true)
  })

  it('memo가 변경되면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(base, { ...base, memo: '메모 내용' }))
    // then
    expect(result.current).toBe(true)
  })

  it('tagId가 변경되면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() => useEventFormDirty(base, { ...base, tagId: 'tag-1' }))
    // then
    expect(result.current).toBe(true)
  })

  it('eventTime이 변경되면 dirty는 true다', () => {
    // given / when
    const { result } = renderHook(() =>
      useEventFormDirty(base, { ...base, eventTime: { time_type: 'at', timestamp: 1743375600 } })
    )
    // then
    expect(result.current).toBe(true)
  })
})
