import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.resetModules()
  })

  it('localStorage에 저장된 값이 없으면 디폴트 테마는 system이다', async () => {
    // when
    const { useThemeStore } = await import('../../src/stores/themeStore')

    // then
    expect(useThemeStore.getState().theme).toBe('system')
  })

  it('localStorage에 저장된 값이 있으면 해당 테마로 초기화된다', async () => {
    // given
    localStorage.setItem('theme', 'dark')

    // when
    const { useThemeStore } = await import('../../src/stores/themeStore')

    // then
    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('setTheme 호출 시 localStorage에 저장되고 state가 갱신된다', async () => {
    // given
    const { useThemeStore } = await import('../../src/stores/themeStore')

    // when
    useThemeStore.getState().setTheme('light')

    // then
    expect(useThemeStore.getState().theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
