import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('todo 모드에서 시간 없음 선택이 가능하다', () => {
    // given
    mockStore({ eventType: 'todo', eventTime: null })

    // when
    render(<EventTimePickerShadcn />)

    // then
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    const options = screen.getAllByRole('option')
    const optionValues = options.map(o => (o as HTMLOptionElement).value)
    expect(optionValues).toContain('none')
  })

  it('schedule 모드에서 시간 없음 옵션이 없다', () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: 1743375600 }
    mockStore({ eventType: 'schedule', eventTime: atTime })

    // when
    render(<EventTimePickerShadcn />)

    // then
    const options = screen.getAllByRole('option')
    const optionValues = options.map(o => (o as HTMLOptionElement).value)
    expect(optionValues).not.toContain('none')
  })

  it('at 타입일 때 datetime-local 입력이 표시된다', () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: 1743375600 }
    mockStore({ eventType: 'todo', eventTime: atTime })

    // when
    render(<EventTimePickerShadcn />)

    // then
    const input = screen.getByLabelText('시각')
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

  it('시간 유형을 변경하면 setEventTime이 호출된다', async () => {
    // given
    mockStore({ eventType: 'todo', eventTime: null })
    render(<EventTimePickerShadcn />)

    // when
    await userEvent.selectOptions(screen.getByRole('combobox'), 'at')

    // then
    expect(mockSetEventTime).toHaveBeenCalledWith(
      expect.objectContaining({ time_type: 'at' })
    )
  })
})
