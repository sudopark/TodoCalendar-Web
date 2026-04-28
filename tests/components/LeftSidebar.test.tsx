import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LeftSidebar, { type LeftSidebarProps } from '../../src/components/LeftSidebar'
import { useEventFormStore } from '../../src/stores/eventFormStore'

vi.mock('../../src/firebase', () => ({
  getAuthInstance: vi.fn(() => ({})),
  db: {},
}))

vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: async () => ({ items: [] }) },
}))

function defaultProps(overrides: Partial<LeftSidebarProps> = {}): LeftSidebarProps {
  return {
    sidebarOpen: true,
    sidebarMonth: new Date(2026, 2, 1), // March 2026
    selectedDate: null,
    getHolidayNames: () => [],
    onSetSelectedDate: vi.fn(),
    onSetSidebarMonth: vi.fn(),
    onOpenEventForm: vi.fn(),
    ...overrides,
  }
}

function renderSidebar(props?: Partial<LeftSidebarProps>) {
  return render(
    <MemoryRouter>
      <LeftSidebar {...defaultProps(props)} />
    </MemoryRouter>
  )
}

describe('LeftSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventFormStore.getState().closeForm()
  })

  it('사이드바가 열려 있을 때 w-64 클래스가 적용된다', () => {
    // given: 사이드바 열림 상태
    const { container } = renderSidebar({ sidebarOpen: true })

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-64')
  })

  it('사이드바가 닫혀 있을 때 w-0 클래스가 적용된다', () => {
    // given: 사이드바 닫힘 상태
    const { container } = renderSidebar({ sidebarOpen: false })

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('w-0')
  })

  it('사이드바가 열려 있을 때 달력 그리드를 렌더링한다', () => {
    // given: 사이드바 열림, 2026년 3월
    renderSidebar()

    // then: 요일 헤더 렌더됨 (한국어 i18n)
    ;['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('사이드바에 duration-200 트랜지션 클래스가 적용된다', () => {
    // given
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('duration-200')
  })

  it('모바일에서 숨겨지는 hidden md:flex 클래스가 적용된다', () => {
    // given
    const { container } = renderSidebar()

    // then
    const sidebar = container.firstChild as HTMLElement
    expect(sidebar).toHaveClass('hidden', 'md:flex')
  })

  it('현재 달의 날짜를 렌더링한다', () => {
    // given: 2026년 3월
    renderSidebar()

    // then: 3월의 날짜가 표시됨
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
  })

  it('날짜를 클릭하면 onSetSelectedDate 콜백이 호출된다', async () => {
    // given: 2026년 3월
    const onSetSelectedDate = vi.fn()
    renderSidebar({ onSetSelectedDate })

    // when
    const day15 = screen.getByText('15')
    await userEvent.click(day15)

    // then: 콜백이 호출됨 (날짜 선택은 부모가 담당)
    expect(onSetSelectedDate).toHaveBeenCalled()
  })

  it('이전 달 버튼과 다음 달 버튼이 렌더링된다', () => {
    // given: 사이드바 열림, 2026년 3월
    renderSidebar()

    // then: 이전/다음 달 네비게이션 버튼이 표시됨
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('이전 달 버튼을 클릭하면 onSetSidebarMonth 콜백이 호출된다', async () => {
    // given: 사이드바 열림, 2026년 3월
    const onSetSidebarMonth = vi.fn()
    renderSidebar({ onSetSidebarMonth })

    // when
    const prevButton = screen.getByRole('button', { name: /previous/i })
    await userEvent.click(prevButton)

    // then: 콜백이 호출됨 (월 변경은 부모가 담당)
    expect(onSetSidebarMonth).toHaveBeenCalled()
  })

  it('다음 달 버튼을 클릭하면 onSetSidebarMonth 콜백이 호출된다', async () => {
    // given: 사이드바 열림, 2026년 3월
    const onSetSidebarMonth = vi.fn()
    renderSidebar({ onSetSidebarMonth })

    // when
    const nextButton = screen.getByRole('button', { name: /next/i })
    await userEvent.click(nextButton)

    // then: 콜백이 호출됨 (월 변경은 부모가 담당)
    expect(onSetSidebarMonth).toHaveBeenCalled()
  })

  it('이벤트 추가 버튼이 렌더링된다', () => {
    // given: 사이드바 열림
    renderSidebar()

    // then: 이벤트 추가 버튼이 표시됨
    expect(screen.getByTestId('sidebar-create-event')).toBeInTheDocument()
  })

  it('이벤트 추가 버튼 클릭 후 Todo를 선택하면 eventFormStore가 열린다', async () => {
    // given: 사이드바 열림, 실제 store의 openForm을 prop으로 전달
    const onOpenEventForm = useEventFormStore.getState().openForm
    renderSidebar({ onOpenEventForm })

    // when: 버튼 클릭 → 드롭다운 표시 → Todo 선택
    await userEvent.click(screen.getByTestId('sidebar-create-event'))
    await userEvent.click(screen.getByText('Todo'))

    // then: eventFormStore가 열리고 eventType이 todo
    expect(useEventFormStore.getState().isOpen).toBe(true)
    expect(useEventFormStore.getState().eventType).toBe('todo')
  })
})
