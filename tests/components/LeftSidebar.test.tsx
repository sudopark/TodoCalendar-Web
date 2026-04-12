import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LeftSidebar from '../../src/components/LeftSidebar'
import { useUiStore } from '../../src/stores/uiStore'
import { useHolidayStore } from '../../src/stores/holidayStore'

vi.mock('../../src/firebase', () => ({
  auth: {},
  db: {},
}))

vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: async () => ({ items: [] }) },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderSidebar() {
  return render(
    <MemoryRouter>
      <LeftSidebar />
    </MemoryRouter>
  )
}

describe('LeftSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('사이드바가 열려 있을 때 w-64 클래스가 적용된다', () => {
    // given: 사이드바 열림 상태
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-64')
  })

  it('사이드바가 닫혀 있을 때 w-0 클래스가 적용된다', () => {
    // given: 사이드바 닫힘 상태
    useUiStore.setState({ sidebarOpen: false, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-0')
  })

  it('사이드바가 열려 있을 때 달력 그리드를 렌더링한다', () => {
    // given: 사이드바 열림, 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 요일 헤더 렌더됨 (한국어 i18n)
    ;['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('사이드바에 transition-all duration-200 클래스가 적용된다', () => {
    // given
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('transition-all', 'duration-200')
  })

  it('모바일에서 숨겨지는 hidden md:flex 클래스가 적용된다', () => {
    // given
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('hidden', 'md:flex')
  })

  it('현재 달의 날짜를 렌더링한다', () => {
    // given: 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 3월의 날짜가 표시됨
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
  })

  it('날짜를 클릭하면 uiStore의 selectedDate가 변경된다', async () => {
    // given: 2026년 3월, selectedDate 없음
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1), selectedDate: null })

    // when
    renderSidebar()
    const day15 = screen.getByText('15')
    await userEvent.click(day15)

    // then: selectedDate가 설정됨
    const selectedDate = useUiStore.getState().selectedDate
    expect(selectedDate).not.toBeNull()
    expect(selectedDate?.getDate()).toBe(15)
    expect(selectedDate?.getMonth()).toBe(2)
    expect(selectedDate?.getFullYear()).toBe(2026)
  })

  it('이전 달 버튼과 다음 달 버튼이 렌더링된다', () => {
    // given: 사이드바 열림, 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 이전/다음 달 네비게이션 버튼이 표시됨
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('이전 달 버튼을 클릭하면 sidebarMonth가 이전 달로 변경되고 currentMonth는 그대로다', async () => {
    // given: 사이드바 열림, 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()
    const prevButton = screen.getByRole('button', { name: /previous/i })
    await userEvent.click(prevButton)

    // then: sidebarMonth가 2026년 2월로 변경됨, currentMonth는 변경 없음
    const state = useUiStore.getState()
    expect(state.sidebarMonth.getFullYear()).toBe(2026)
    expect(state.sidebarMonth.getMonth()).toBe(1)
    expect(state.currentMonth.getMonth()).toBe(2)
  })

  it('다음 달 버튼을 클릭하면 sidebarMonth가 다음 달로 변경되고 currentMonth는 그대로다', async () => {
    // given: 사이드바 열림, 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()
    const nextButton = screen.getByRole('button', { name: /next/i })
    await userEvent.click(nextButton)

    // then: sidebarMonth가 2026년 4월로 변경됨, currentMonth는 변경 없음
    const state = useUiStore.getState()
    expect(state.sidebarMonth.getFullYear()).toBe(2026)
    expect(state.sidebarMonth.getMonth()).toBe(3)
    expect(state.currentMonth.getMonth()).toBe(2)
  })

  it('렌더링 시 현재 달의 공휴일 fetch가 호출된다', async () => {
    // given: holidayApi mock, 2026년 3월
    const { holidayApi } = await import('../../src/api/holidayApi')
    const getHolidaysSpy = vi.spyOn(holidayApi, 'getHolidays')
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 2026년 공휴일 fetch가 수행됨
    await waitFor(() => {
      expect(useHolidayStore.getState().loadedYears.has(2026)).toBe(true)
    })
    getHolidaysSpy.mockRestore()
  })

  it('이벤트 추가 버튼이 렌더링된다', () => {
    // given: 사이드바 열림
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 이벤트 추가 버튼이 표시됨
    expect(screen.getByTestId('sidebar-create-event')).toBeInTheDocument()
  })

  it('이벤트 추가 버튼을 클릭하면 TypeSelectorPopup이 나타난다', async () => {
    // given: 사이드바 열림
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()
    await userEvent.click(screen.getByTestId('sidebar-create-event'))

    // then: Todo / Schedule 선택 팝업이 표시됨
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
  })

  it('TypeSelectorPopup에서 Todo를 선택하면 /todos/new로 이동한다', async () => {
    // given: 사이드바 열림
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()
    await userEvent.click(screen.getByTestId('sidebar-create-event'))
    await userEvent.click(screen.getByText('Todo'))

    // then: /todos/new 경로로 navigate
    expect(mockNavigate.mock.calls[0][0]).toBe('/todos/new')
  })

  it('TypeSelectorPopup에서 Schedule을 선택하면 /schedules/new로 이동한다', async () => {
    // given: 사이드바 열림
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), sidebarMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()
    await userEvent.click(screen.getByTestId('sidebar-create-event'))
    await userEvent.click(screen.getByText('Schedule'))

    // then: /schedules/new 경로로 navigate
    expect(mockNavigate.mock.calls[0][0]).toBe('/schedules/new')
  })
})
