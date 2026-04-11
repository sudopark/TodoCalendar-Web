import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeftSidebar from '../../src/components/LeftSidebar'
import { useUiStore } from '../../src/stores/uiStore'

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

    // then: 요일 헤더 렌더됨
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
})
