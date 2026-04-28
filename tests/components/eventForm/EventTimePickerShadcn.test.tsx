import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventTimePickerShadcn } from '../../../src/components/eventForm/EventTimePickerShadcn'
import { useEventFormStore } from '../../../src/stores/eventFormStore'

vi.mock('../../../src/stores/eventFormStore', () => ({ useEventFormStore: vi.fn() }))

const mockSetEventTime = vi.fn()

function mockStore(overrides: {
  eventTime?: import('../../../src/models').EventTime | null
  eventType?: 'todo' | 'schedule'
}) {
  vi.mocked(useEventFormStore).mockImplementation((sel: any) =>
    sel({
      eventTime: overrides.eventTime ?? null,
      eventType: overrides.eventType ?? 'todo',
      setEventTime: mockSetEventTime,
    })
  )
}

describe('EventTimePickerShadcn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('todo 모드에서 시간 선택 combobox가 렌더된다', () => {
    // given
    mockStore({ eventType: 'todo', eventTime: null })

    // when
    render(<EventTimePickerShadcn />)

    // then: shadcn Select 트리거(combobox)가 존재
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('todo 모드에서 eventTime=null이면 datetime-local 입력이 없다 (시간 없음 상태)', () => {
    // given
    mockStore({ eventType: 'todo', eventTime: null })

    // when
    const { container } = render(<EventTimePickerShadcn />)

    // then: combobox 트리거가 존재하고 datetime-local input은 없음
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(container.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument()
  })

  it('schedule 모드에서 at 타입이면 datetime-local 입력이 표시된다', () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: 1743375600 }
    mockStore({ eventType: 'schedule', eventTime: atTime })

    // when
    const { container } = render(<EventTimePickerShadcn />)

    // then: at 타입 → datetime-local 입력 표시
    const input = container.querySelector('input[type="datetime-local"]')
    expect(input).toBeInTheDocument()
  })

  it('at 타입일 때 datetime-local 입력이 표시된다', () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: 1743375600 }
    mockStore({ eventType: 'todo', eventTime: atTime })

    // when
    const { container } = render(<EventTimePickerShadcn />)

    // then: at 타입 → datetime-local 입력 표시
    const input = container.querySelector('input[type="datetime-local"]')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'datetime-local')
  })

  it('period 타입일 때 시작/종료 입력이 표시된다', () => {
    // given
    const periodTime = {
      time_type: 'period' as const,
      period_start: 1743375600,
      period_end: 1743379200,
    }
    mockStore({ eventType: 'todo', eventTime: periodTime })

    // when
    render(<EventTimePickerShadcn />)

    // then
    expect(screen.getByLabelText('시작')).toBeInTheDocument()
    expect(screen.getByLabelText('종료')).toBeInTheDocument()
    expect(screen.getByLabelText('시작')).toHaveAttribute('type', 'datetime-local')
    expect(screen.getByLabelText('종료')).toHaveAttribute('type', 'datetime-local')
  })

  it('allday 타입일 때 date 입력이 표시된다', () => {
    // given
    const alldayTime = {
      time_type: 'allday' as const,
      period_start: 1743375600,
      period_end: 1743375600,
      seconds_from_gmt: 32400,
    }
    mockStore({ eventType: 'todo', eventTime: alldayTime })

    // when
    render(<EventTimePickerShadcn />)

    // then
    expect(screen.getByLabelText('시작 날짜')).toBeInTheDocument()
    expect(screen.getByLabelText('종료 날짜')).toBeInTheDocument()
    expect(screen.getByLabelText('시작 날짜')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('종료 날짜')).toHaveAttribute('type', 'date')
  })
})
