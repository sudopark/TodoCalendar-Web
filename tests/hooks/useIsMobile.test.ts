import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../../src/hooks/useIsMobile'

type MQListener = (e: MediaQueryListEvent) => void

function setupMatchMedia(initialMatches: boolean) {
  let listener: MQListener | null = null
  const mql = {
    get matches() { return current },
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn((_: string, l: MQListener) => { listener = l }),
    removeEventListener: vi.fn(() => { listener = null }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  let current = initialMatches
  window.matchMedia = vi.fn().mockReturnValue(mql) as any
  return {
    fire(matches: boolean) {
      current = matches
      listener?.({ matches } as MediaQueryListEvent)
    },
  }
}

describe('useIsMobile', () => {
  const original = window.matchMedia
  afterEach(() => { window.matchMedia = original })

  it('초기 viewport가 모바일이면 true를 반환한다', () => {
    // given: 모바일 viewport
    setupMatchMedia(true)

    // when
    const { result } = renderHook(() => useIsMobile())

    // then
    expect(result.current).toBe(true)
  })

  it('초기 viewport가 데스크톱이면 false를 반환한다', () => {
    // given
    setupMatchMedia(false)

    // when
    const { result } = renderHook(() => useIsMobile())

    // then
    expect(result.current).toBe(false)
  })

  it('viewport가 데스크톱에서 모바일로 바뀌면 true로 갱신된다', () => {
    // given
    const { fire } = setupMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // when
    act(() => fire(true))

    // then
    expect(result.current).toBe(true)
  })
})
