import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LeftSidebar from '../../src/components/LeftSidebar'
import { useUiStore } from '../../src/stores/uiStore'
import { useHolidayStore } from '../../src/stores/holidayStore'

vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: async () => ({ items: [] }) },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

function renderSidebar() {
  return render(
    <MemoryRouter>
      <LeftSidebar />
    </MemoryRouter>
  )
}

describe('LeftSidebar', () => {
  it('사이드바가 열려 있을 때 w-64 클래스가 적용된다', () => {
    // given: 사이드바 열림 상태
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-64')
  })

  it('사이드바가 닫혀 있을 때 w-0 클래스가 적용된다', () => {
    // given: 사이드바 닫힘 상태
    useUiStore.setState({ sidebarOpen: false, currentMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-0')
  })

  it('사이드바가 열려 있을 때 달력 그리드를 렌더링한다', () => {
    // given: 사이드바 열림, 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 요일 헤더 렌더됨 (한국어 i18n)
    ;['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('사이드바에 transition-all duration-200 클래스가 적용된다', () => {
    // given
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('transition-all', 'duration-200')
  })

  it('모바일에서 숨겨지는 hidden md:flex 클래스가 적용된다', () => {
    // given
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1) })

    // when
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('hidden', 'md:flex')
  })

  it('현재 달의 날짜를 렌더링한다', () => {
    // given: 2026년 3월
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 3월의 날짜가 표시됨
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
  })

  it('날짜를 클릭하면 uiStore의 selectedDate가 변경된다', async () => {
    // given: 2026년 3월, selectedDate 없음
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1), selectedDate: null })

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

  it('렌더링 시 현재 달의 공휴일 fetch가 호출된다', async () => {
    // given: holidayApi mock, 2026년 3월
    const { holidayApi } = await import('../../src/api/holidayApi')
    const getHolidaysSpy = vi.spyOn(holidayApi, 'getHolidays')
    useHolidayStore.setState({ holidays: new Map(), loadedYears: new Set() })
    useUiStore.setState({ sidebarOpen: true, currentMonth: new Date(2026, 2, 1) })

    // when
    renderSidebar()

    // then: 2026년 공휴일 fetch가 수행됨
    await waitFor(() => {
      expect(useHolidayStore.getState().loadedYears.has(2026)).toBe(true)
    })
    getHolidaysSpy.mockRestore()
  })
})
