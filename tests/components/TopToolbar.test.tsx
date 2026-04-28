import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TopToolbar, { type TopToolbarProps } from '../../src/components/TopToolbar'

const noop = vi.fn()

function defaultProps(overrides: Partial<TopToolbarProps> = {}): TopToolbarProps {
  return {
    currentMonth: new Date(2026, 2, 1), // March 2026
    sidebarOpen: true,
    loading: false,
    onToggleSidebar: noop,
    onGoToToday: noop,
    onGoToPrevMonth: noop,
    onGoToNextMonth: noop,
    onRefresh: noop,
    ...overrides,
  }
}

function renderToolbar(props?: Partial<TopToolbarProps>) {
  return render(
    <MemoryRouter>
      <TopToolbar {...defaultProps(props)} />
    </MemoryRouter>
  )
}

describe('TopToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('현재 월 제목을 표시한다', () => {
    // given: currentMonth = 2026년 3월
    // when
    renderToolbar()

    // then: 연도가 표시됨 (월은 locale에 따라 다름)
    expect(screen.getByText('2026')).toBeInTheDocument()
    // i18n.language='ko' 인 테스트 환경에서는 '3월', 'en'이면 'March'
    expect(screen.getByText(/March|3월/)).toBeInTheDocument()
  })

  it('사이드바 토글, 오늘, 이전/다음 달 버튼을 렌더한다', () => {
    // given / when
    renderToolbar()

    // then
    expect(screen.getByRole('button', { name: /사이드바 토글/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /오늘/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument()
  })

  it('로고 이미지를 렌더한다', () => {
    // given / when
    renderToolbar()

    // then
    expect(screen.getByRole('img', { name: 'To-do Calendar' })).toBeInTheDocument()
  })

  it('이전 달 버튼을 클릭하면 onGoToPrevMonth 콜백이 호출된다', () => {
    // given: 3월 표시, onGoToPrevMonth mock
    const onGoToPrevMonth = vi.fn()
    renderToolbar({ onGoToPrevMonth })

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))

    // then: 콜백이 호출됨 (표시 월 변경은 부모가 담당)
    expect(onGoToPrevMonth).toHaveBeenCalled()
  })

  it('다음 달 버튼을 클릭하면 onGoToNextMonth 콜백이 호출된다', () => {
    // given: 3월 표시, onGoToNextMonth mock
    const onGoToNextMonth = vi.fn()
    renderToolbar({ onGoToNextMonth })

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))

    // then: 콜백이 호출됨
    expect(onGoToNextMonth).toHaveBeenCalled()
  })

  it('주어진 currentMonth prop을 기준으로 월을 표시한다', () => {
    // given: currentMonth = 2026년 2월
    renderToolbar({ currentMonth: new Date(2026, 1, 1) })

    // then: 연도가 표시됨 (월은 locale에 따라 다름)
    expect(screen.getByText('2026')).toBeInTheDocument()
    expect(screen.getByText(/February|2월/)).toBeInTheDocument()
  })

  it('오늘 버튼을 클릭하면 onGoToToday 콜백이 호출된다', () => {
    // given: onGoToToday mock
    const onGoToToday = vi.fn()
    renderToolbar({ onGoToToday })

    // when
    fireEvent.click(screen.getByRole('button', { name: /오늘/i }))

    // then: 콜백이 호출됨
    expect(onGoToToday).toHaveBeenCalled()
  })

  it('사이드바 토글 버튼을 클릭하면 onToggleSidebar 콜백이 호출된다', () => {
    // given: onToggleSidebar mock
    const onToggleSidebar = vi.fn()
    renderToolbar({ onToggleSidebar })

    // when
    fireEvent.click(screen.getByRole('button', { name: /사이드바 토글/i }))

    // then: 콜백이 호출됨
    expect(onToggleSidebar).toHaveBeenCalled()
  })

  it('새로고침 버튼이 렌더링된다', () => {
    // given / when
    renderToolbar()

    // then
    expect(screen.getByLabelText(/새로고침|refresh/i)).toBeInTheDocument()
  })

  it('새로고침 버튼을 클릭하면 onRefresh 콜백이 호출된다', () => {
    // given
    const onRefresh = vi.fn()
    renderToolbar({ onRefresh })

    // when
    fireEvent.click(screen.getByLabelText(/새로고침|refresh/i))

    // then
    expect(onRefresh).toHaveBeenCalled()
  })

  it('로딩 중일 때 새로고침 버튼이 비활성화된다', () => {
    // given: loading = true
    renderToolbar({ loading: true })

    // then
    expect(screen.getByLabelText(/새로고침|refresh/i)).toBeDisabled()
  })
})
