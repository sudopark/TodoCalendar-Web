import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUiStore } from '../../src/stores/uiStore'
import TopToolbar from '../../src/components/TopToolbar'

function renderToolbar() {
  return render(
    <MemoryRouter>
      <TopToolbar />
    </MemoryRouter>
  )
}

describe('TopToolbar', () => {
  beforeEach(() => {
    useUiStore.setState({
      sidebarOpen: true,
      currentMonth: new Date(2026, 2, 1), // March 2026
    })
  })

  it('현재 월 제목을 표시한다', () => {
    // given: currentMonth = 2026년 3월
    // when
    renderToolbar()

    // then
    expect(screen.getByText('March 2026')).toBeInTheDocument()
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

  it('이전 달 버튼을 클릭하면 이전 달로 이동한다', () => {
    // given: 3월 표시
    renderToolbar()

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))

    // then
    expect(screen.getByText('February 2026')).toBeInTheDocument()
  })

  it('다음 달 버튼을 클릭하면 다음 달로 이동한다', () => {
    // given: 3월 표시
    renderToolbar()

    // when
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))

    // then
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('오늘 버튼을 클릭하면 현재 월로 이동한다', () => {
    // given: 다른 달로 이동된 상태
    useUiStore.setState({ currentMonth: new Date(2025, 0, 1) })
    renderToolbar()

    // when
    fireEvent.click(screen.getByRole('button', { name: /오늘/i }))

    // then: 현재 날짜의 월이 표시됨
    const today = new Date()
    const expectedTitle = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(today)
    expect(screen.getByText(expectedTitle)).toBeInTheDocument()
  })

  it('사이드바 토글 버튼을 클릭하면 사이드바 상태가 변경된다', () => {
    // given: 사이드바 열림 상태
    renderToolbar()

    // when
    fireEvent.click(screen.getByRole('button', { name: /사이드바 토글/i }))

    // then: 사이드바가 닫힘
    expect(useUiStore.getState().sidebarOpen).toBe(false)
  })
})
