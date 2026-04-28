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
  it('EventTime 값이 주어지면 시간 타입 선택기가 렌더된다', () => {
    // given / when
    render(<EventTimeSection {...defaultProps()} />)

    // then: 시간 타입 선택 combobox가 보임 (shadcn Select 트리거)
    expect(screen.getByRole('combobox', { name: /시각/i })).toBeInTheDocument()
  })

  it('at 타입 이벤트 시간이 주어지면 datetime-local 입력이 표시된다', () => {
    // given / when
    const { container } = render(<EventTimeSection {...defaultProps()} />)

    // then: at 타입 → datetime-local 입력 표시
    const datetimeInput = container.querySelector('input[type="datetime-local"]')
    expect(datetimeInput).toBeInTheDocument()
  })

  it('반복 섹션이 렌더된다 (popover 트리거 표시)', () => {
    // given / when
    render(<EventTimeSection {...defaultProps()} />)

    // then: RepeatingSection의 popover 트리거가 보임 ("반복 안 함" 텍스트)
    expect(screen.getByText('반복 안 함')).toBeInTheDocument()
  })

  it('required=false 이면 EventTime을 시간 없음 상태로 시작할 수 있다 (allowNone=true, null 값에서)', () => {
    // given / when
    const { container } = render(<EventTimeSection {...defaultProps({ required: false, eventTime: null })} />)

    // then: 시간 없음 상태 → combobox는 있고 datetime-local input은 없음
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(container.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument()
  })

  it('eventTime이 null이고 required=false면 반복 섹션은 렌더되지 않는다', () => {
    // given / when
    render(<EventTimeSection {...defaultProps({ required: false, eventTime: null })} />)

    // then: eventTime이 없으면 RepeatingSection은 null 반환
    expect(screen.queryByText('반복 안 함')).not.toBeInTheDocument()
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
