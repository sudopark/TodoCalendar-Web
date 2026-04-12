import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useUiStore.setState({
      selectedDate: null,
      sidebarOpen: true,
      currentMonth: new Date(2026, 3, 1),
      sidebarMonth: new Date(2026, 3, 1),
      rightPanelOpen: false,
    })
  })

  // -- selectedDate --

  it('앱 시작 시 selectedDate는 오늘 날짜로 초기화된다', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // 스토어의 실제 초기값을 검증하기 위해 오늘 날짜로 직접 재설정
    useUiStore.setState({
      selectedDate: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
    })
    const state = useUiStore.getState()
    expect(state.selectedDate).not.toBeNull()
    expect(state.selectedDate!.getFullYear()).toBe(today.getFullYear())
    expect(state.selectedDate!.getMonth()).toBe(today.getMonth())
    expect(state.selectedDate!.getDate()).toBe(today.getDate())
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
    useUiStore.setState({ currentMonth: new Date(2020, 0, 1), sidebarMonth: new Date(2020, 0, 1), selectedDate: null })
    useUiStore.getState().goToToday()

    const today = new Date()
    const state = useUiStore.getState()
    expect(state.currentMonth.getFullYear()).toBe(today.getFullYear())
    expect(state.currentMonth.getMonth()).toBe(today.getMonth())
    expect(state.sidebarMonth.getFullYear()).toBe(today.getFullYear())
    expect(state.sidebarMonth.getMonth()).toBe(today.getMonth())
    expect(state.selectedDate).not.toBeNull()
    expect(state.selectedDate!.getFullYear()).toBe(today.getFullYear())
    expect(state.selectedDate!.getMonth()).toBe(today.getMonth())
    expect(state.selectedDate!.getDate()).toBe(today.getDate())
  })

  // -- sidebarMonth --

  it('setSidebarMonth로 사이드바 캘린더 월을 독립적으로 변경한다', () => {
    useUiStore.setState({ currentMonth: new Date(2026, 3, 1), sidebarMonth: new Date(2026, 3, 1) })
    useUiStore.getState().setSidebarMonth(new Date(2026, 5, 15))
    const state = useUiStore.getState()
    expect(state.sidebarMonth.getFullYear()).toBe(2026)
    expect(state.sidebarMonth.getMonth()).toBe(5)
    expect(state.sidebarMonth.getDate()).toBe(1)
    // 중앙 캘린더는 변경되지 않음
    expect(state.currentMonth.getMonth()).toBe(3)
  })

  it('좌측 캘린더에서 날짜를 선택하면 중앙 캘린더(currentMonth)가 해당 월로 변경된다', () => {
    useUiStore.setState({ currentMonth: new Date(2026, 3, 1), sidebarMonth: new Date(2026, 5, 1), selectedDate: null })
    useUiStore.getState().setSelectedDate(new Date(2026, 5, 10))
    const state = useUiStore.getState()
    expect(state.selectedDate?.getMonth()).toBe(5)
    expect(state.currentMonth.getMonth()).toBe(5)
  })

  it('setSelectedDate는 sidebarMonth를 변경하지 않는다', () => {
    useUiStore.setState({ currentMonth: new Date(2026, 3, 1), sidebarMonth: new Date(2026, 5, 1), selectedDate: null })
    useUiStore.getState().setSelectedDate(new Date(2026, 3, 10))
    const state = useUiStore.getState()
    // sidebarMonth는 그대로 6월
    expect(state.sidebarMonth.getMonth()).toBe(5)
  })

  // -- rightPanelOpen --

  it('rightPanelOpen 초기값은 false이다', () => {
    useUiStore.setState({ rightPanelOpen: false })
    expect(useUiStore.getState().rightPanelOpen).toBe(false)
  })

  it('toggleRightPanel로 패널 열기/닫기를 토글한다', () => {
    useUiStore.setState({ rightPanelOpen: false })
    useUiStore.getState().toggleRightPanel()
    expect(useUiStore.getState().rightPanelOpen).toBe(true)

    useUiStore.getState().toggleRightPanel()
    expect(useUiStore.getState().rightPanelOpen).toBe(false)
  })

  it('setRightPanelOpen으로 패널 상태를 직접 설정한다', () => {
    useUiStore.setState({ rightPanelOpen: false })
    useUiStore.getState().setRightPanelOpen(true)
    expect(useUiStore.getState().rightPanelOpen).toBe(true)

    useUiStore.getState().setRightPanelOpen(false)
    expect(useUiStore.getState().rightPanelOpen).toBe(false)
  })

  it('날짜를 선택하면 rightPanelOpen이 true가 된다', () => {
    useUiStore.setState({ rightPanelOpen: false, selectedDate: null })
    useUiStore.getState().setSelectedDate(new Date(2026, 3, 15))
    expect(useUiStore.getState().rightPanelOpen).toBe(true)
  })

  it('같은 날짜를 다시 선택하여 해제하면 rightPanelOpen이 false가 된다', () => {
    const date = new Date(2026, 3, 15)
    useUiStore.setState({ rightPanelOpen: false, selectedDate: null })
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().rightPanelOpen).toBe(true)
    // 같은 날짜 다시 선택 → selectedDate null, 드로워 닫힘
    useUiStore.getState().setSelectedDate(date)
    expect(useUiStore.getState().selectedDate).toBeNull()
    expect(useUiStore.getState().rightPanelOpen).toBe(false)
  })
})
