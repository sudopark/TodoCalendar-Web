import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EventTime } from '../../../src/models'
import { EventTimeSection } from '../../../src/components/eventForm/EventTimeSection'

function defaultProps(overrides: Partial<React.ComponentProps<typeof EventTimeSection>> = {}) {
  const eventTime: EventTime = { time_type: 'at', timestamp: 1743375600 }
  return {
    eventTime,
    onEventTimeChange: vi.fn(),
    repeating: null,
    onRepeatingChange: vi.fn(),
    required: true,
    ...overrides,
  }
}

describe('EventTimeSection', () => {
  it('EventTime 값이 주어지면 시간 입력 위젯이 렌더된다', () => {
    // given / when
    render(<EventTimeSection {...defaultProps()} />)

    // then: EventTimePicker의 시간 라디오 옵션이 보임
    expect(screen.getByText('특정 시각')).toBeInTheDocument()
  })

  it('반복 활성화 체크박스가 렌더된다', () => {
    // given / when
    render(<EventTimeSection {...defaultProps()} />)

    // then: RepeatingPicker의 반복 체크박스가 보임
    expect(screen.getByLabelText('반복')).toBeInTheDocument()
  })

  it('required=false 이면 EventTime을 "시간 없음"으로 선택할 수 있다', () => {
    // given / when
    render(<EventTimeSection {...defaultProps({ required: false, eventTime: null })} />)

    // then
    expect(screen.getByText('시간 없음')).toBeInTheDocument()
  })

  it('eventTime이 null이고 required=false면 반복 섹션은 렌더되지 않는다', () => {
    // given / when
    render(<EventTimeSection {...defaultProps({ required: false, eventTime: null })} />)

    // then
    expect(screen.queryByLabelText('반복')).not.toBeInTheDocument()
  })

  it('All day 체크박스 클릭 시 eventTime이 allday 타입으로 전환된다', async () => {
    // given: at 타입의 eventTime
    const onChange = vi.fn()
    render(<EventTimeSection {...defaultProps({ onEventTimeChange: onChange })} />)

    // when
    await userEvent.click(screen.getByRole('checkbox', { name: '종일' }))

    // then
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.time_type).toBe('allday')
  })

  it('All day 체크 해제 시 직전 시간 유형으로 복원된다', async () => {
    // given: allday 타입
    const alldayValue: EventTime = {
      time_type: 'allday',
      period_start: 1743375600,
      period_end: 1743375600,
      seconds_from_gmt: 9 * 3600,
    }
    const onChange = vi.fn()
    render(<EventTimeSection {...defaultProps({ eventTime: alldayValue, onEventTimeChange: onChange })} />)

    // when
    await userEvent.click(screen.getByRole('checkbox', { name: '종일' }))

    // then: at (기본 prevNonAllday)으로 복원
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.time_type).toBe('at')
  })
})
