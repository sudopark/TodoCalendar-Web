import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MiniCalendarGrid from '../../src/calendar/MiniCalendarGrid'
import { buildCalendarGrid } from '../../src/calendar/calendarUtils'
import { useUiStore } from '../../src/stores/uiStore'

vi.mock('../../src/stores/holidayStore', () => ({
  useHolidayStore: vi.fn((selector: any) => {
    const state = { getHolidayNames: () => [] }
    return selector(state)
  }),
}))

const today = new Date(2026, 2, 15) // March 15, 2026 (Sunday)
const marchDays = buildCalendarGrid(2026, 2, today)

describe('MiniCalendarGrid', () => {
  beforeEach(() => {
    useUiStore.setState({ selectedDate: null })
  })

  it('7개의 요일 헤더를 렌더링한다', () => {
    // given / when
    render(<MiniCalendarGrid days={marchDays} />)

    // then: 한국어 요일 헤더
    ;['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument()
    })
  })

  it('월간 그리드의 날짜 셀들을 렌더링한다', () => {
    // given / when
    render(<MiniCalendarGrid days={marchDays} />)

    // then: 날짜 1은 표시됨
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
  })

  it('오늘 날짜에 파란 배경 클래스가 적용된다', () => {
    // given / when
    render(<MiniCalendarGrid days={marchDays} />)

    // then: 15일이 오늘이므로 bg-brand-dark 클래스
    const todayElements = document.querySelectorAll('.bg-brand-dark')
    expect(todayElements.length).toBe(1)
    expect(todayElements[0].textContent).toBe('15')
  })

  it('날짜 셀 클릭 시 해당 날짜가 선택된다', () => {
    // given
    render(<MiniCalendarGrid days={marchDays} />)

    // when: 10일 클릭
    const march10 = marchDays.find(d => d.isCurrentMonth && d.dayOfMonth === 10)!
    const cells = document.querySelectorAll('.cursor-pointer')
    const march10Cell = Array.from(cells).find(cell => cell.textContent === '10')
    fireEvent.click(march10Cell!)

    // then: 선택된 날짜가 10일
    const selected = useUiStore.getState().selectedDate
    expect(selected?.getDate()).toBe(march10.date.getDate())
    expect(selected?.getMonth()).toBe(2)
  })

  it('선택된 날짜에 ring 클래스가 적용된다', () => {
    // given: 20일 선택 상태
    const march20 = marchDays.find(d => d.isCurrentMonth && d.dayOfMonth === 20)!
    useUiStore.setState({ selectedDate: march20.date })

    // when
    render(<MiniCalendarGrid days={marchDays} />)

    // then: ring-2 ring-brand-dark 클래스가 있는 요소
    const ringElements = document.querySelectorAll('.ring-2.ring-brand-dark')
    expect(ringElements.length).toBe(1)
    expect(ringElements[0].textContent).toBe('20')
  })

  it('현재 달이 아닌 날짜는 흐리게 표시된다', () => {
    // given / when
    render(<MiniCalendarGrid days={marchDays} />)

    // then: 현재 달이 아닌 첫 번째 셀은 text-gray-400 클래스
    const outsideCells = document.querySelectorAll('.text-gray-400')
    expect(outsideCells.length).toBeGreaterThan(0)
  })
})
