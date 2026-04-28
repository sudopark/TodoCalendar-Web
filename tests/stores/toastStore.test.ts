import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToastStore } from '../../src/stores/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
    vi.useRealTimers()
  })

  it('show 호출 시 toasts 배열에 항목이 추가된다', () => {
    // when
    useToastStore.getState().show('event.created.todo')

    // then
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].key).toBe('event.created.todo')
  })

  it('show 호출 시 타입을 지정하지 않으면 기본 타입은 info이다', () => {
    // when
    useToastStore.getState().show('error.unknown')

    // then
    expect(useToastStore.getState().toasts[0].type).toBe('info')
  })

  it('show 호출 시 타입을 지정하면 해당 타입이 설정된다', () => {
    // when
    useToastStore.getState().show('error.unknown', 'error')

    // then
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('show 호출 시 params를 전달하면 저장된다', () => {
    // when
    useToastStore.getState().show('dev.seeder.done', 'success', { summary: '태그 3' })

    // then
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].params).toEqual({ summary: '태그 3' })
  })

  it('dismiss 호출 시 해당 항목이 제거된다', () => {
    // given
    useToastStore.getState().show('event.created.todo')
    useToastStore.getState().show('event.created.schedule')
    const firstId = useToastStore.getState().toasts[0].id

    // when
    useToastStore.getState().dismiss(firstId)

    // then
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].key).toBe('event.created.schedule')
  })

  it('3초 후 자동으로 dismiss된다', () => {
    // given
    vi.useFakeTimers()

    // when
    useToastStore.getState().show('error.unknown')
    expect(useToastStore.getState().toasts).toHaveLength(1)

    // then
    vi.advanceTimersByTime(3000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
})
