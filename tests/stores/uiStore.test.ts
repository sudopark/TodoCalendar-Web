import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({
      selectedDate: null,
      sidebarOpen: true,
      currentMonth: new Date(2026, 3, 1),
    })
  })

  // -- selectedDate --

  it('초기 상태에서 selectedDate는 null이다', () => {
    expect(useUiStore.getState().selectedDate).toBeNull()
  })

  it('setSelectedDate로 날짜를 설정할 수 있다', () => {
    const date = new Date(2026, 2, 15)
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toEqual(date)
  })

  it('같은 날짜를 다시 선택하면 선택이 해제된다', () => {
    const date = new Date(2026, 2, 15)
    useUiStore.getState().setSelectedDate(date)
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toBeNull()
  })

  // -- sidebarOpen --

  it('사이드바는 기본적으로 열려있다', () => {
    expect(useUiStore.getState().sidebarOpen).toBe(true)
  })

  it('toggleSidebar로 사이드바를 토글할 수 있다', () => {
    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(false)

    useUiStore.getState().toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(true)
  })

  it('toggleSidebar는 localStorage에 상태를 저장한다', () => {
    useUiStore.getState().toggleSidebar()
    expect(localStorage.getItem('sidebar_open')).toBe('false')
  })

  it('setSidebarOpen으로 사이드바 상태를 직접 설정할 수 있다', () => {
    useUiStore.getState().setSidebarOpen(false)
    expect(useUiStore.getState().sidebarOpen).toBe(false)
    expect(localStorage.getItem('sidebar_open')).toBe('false')
  })

  // -- currentMonth --

  it('goToPrevMonth로 이전 달로 이동한다', () => {
    useUiStore.setState({ currentMonth: new Date(2026, 3, 1) })
    useUiStore.getState().goToPrevMonth()
    const month = useUiStore.getState().currentMonth
    expect(month.getFullYear()).toBe(2026)
    expect(month.getMonth()).toBe(2)
  })

  it('goToNextMonth로 다음 달로 이동한다', () => {
    useUiStore.setState({ currentMonth: new Date(2026, 3, 1) })
    useUiStore.getState().goToNextMonth()
    const month = useUiStore.getState().currentMonth
    expect(month.getFullYear()).toBe(2026)
    expect(month.getMonth()).toBe(4)
  })

  it('setCurrentMonth로 특정 월을 설정한다', () => {
    useUiStore.getState().setCurrentMonth(new Date(2025, 11, 15))
    const month = useUiStore.getState().currentMonth
    expect(month.getFullYear()).toBe(2025)
    expect(month.getMonth()).toBe(11)
    expect(month.getDate()).toBe(1)
  })

  it('goToToday로 오늘 날짜와 해당 월로 이동한다', () => {
    useUiStore.setState({ currentMonth: new Date(2020, 0, 1), selectedDate: null })
    useUiStore.getState().goToToday()

    const today = new Date()
    const state = useUiStore.getState()
    expect(state.currentMonth.getFullYear()).toBe(today.getFullYear())
    expect(state.currentMonth.getMonth()).toBe(today.getMonth())
    expect(state.selectedDate).not.toBeNull()
    expect(state.selectedDate!.getFullYear()).toBe(today.getFullYear())
    expect(state.selectedDate!.getMonth()).toBe(today.getMonth())
    expect(state.selectedDate!.getDate()).toBe(today.getDate())
  })
})
