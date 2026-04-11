import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MiniCalendar from '../../src/calendar/MiniCalendar'
import { useUiStore } from '../../src/stores/uiStore'

vi.mock('../../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: async () => ({ items: [] }) },
}))

describe('MiniCalendar', () => {
  it('현재 달의 날짜 그리드를 렌더링한다', () => {
    // given: currentMonth = 2026년 3월
    useUiStore.setState({ currentMonth: new Date(2026, 2, 1) })

    // when
    render(<MiniCalendar />)

    // then: 3월의 날짜가 표시됨
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
  })

  it('요일 헤더를 렌더링한다', () => {
    // given
    useUiStore.setState({ currentMonth: new Date(2026, 2, 1) })

    // when
    render(<MiniCalendar />)

    // then
    ;['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('uiStore의 currentMonth가 변경되면 새 달의 그리드를 다시 렌더링한다', () => {
    // given: 2월 (28일)
    useUiStore.setState({ currentMonth: new Date(2026, 1, 1) })
    const { rerender } = render(<MiniCalendar />)

    // then: 2월에는 29~31일 없음(2026년은 평년)
    expect(screen.queryAllByText('29').filter(el => el.classList.contains('text-gray-900')).length).toBe(0)

    // when: 3월로 변경 (31일)
    useUiStore.setState({ currentMonth: new Date(2026, 2, 1) })
    rerender(<MiniCalendar />)

    // then: 3월 고유 날짜 31일이 현재 달 스타일로 표시됨
    const allThirtyOne = screen.getAllByText('31')
    const currentMonthThirtyOne = allThirtyOne.filter(el =>
      el.classList.contains('text-gray-900') || el.classList.contains('text-red-500') || el.classList.contains('bg-blue-500')
    )
    expect(currentMonthThirtyOne.length).toBeGreaterThan(0)
  })
})
