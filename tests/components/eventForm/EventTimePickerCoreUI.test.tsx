import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventTimePickerCore } from '../../../src/components/eventForm/EventTimePickerCore'
import type { EventTime } from '../../../src/models'

// 종일(allday) 모드에서 "종료일 지정" 토글 동작 검증 (#127)

describe('EventTimePickerCore — allday 종료일 지정 토글 (#127)', () => {
  it('기본 allday 모드(period_end undefined)는 종료일 토글 OFF, 종료일 입력 미노출', () => {
    // given: period_end 없는 allday
    const value: EventTime = { time_type: 'allday', period_start: 1700000000, seconds_from_gmt: 32400 } as EventTime
    const onChange = vi.fn()

    // when
    render(<EventTimePickerCore value={value} onChange={onChange} allowNone={false} />)

    // then: 토글 체크박스가 unchecked, 종료일 input 없음
    const toggle = screen.getByRole('checkbox', { name: '종료일 지정' })
    expect(toggle).not.toBeChecked()
    expect(screen.queryByLabelText('종료 날짜')).not.toBeInTheDocument()
  })

  it('종료일 토글 ON 하면 종료일 input 이 노출되고 onChange 에 period_end 가 초기화된다', async () => {
    // given: period_end 없는 allday
    const value: EventTime = { time_type: 'allday', period_start: 1700000000, seconds_from_gmt: 32400 } as EventTime
    const onChange = vi.fn()

    render(<EventTimePickerCore value={value} onChange={onChange} allowNone={false} />)

    // when: 종료일 토글 클릭
    const toggle = screen.getByRole('checkbox', { name: '종료일 지정' })
    await userEvent.click(toggle)

    // then: onChange 가 period_end 있는 allday 로 호출됨
    const lastCall = onChange.mock.calls.at(-1)?.[0] as EventTime
    expect(lastCall).toBeTruthy()
    expect(lastCall.time_type).toBe('allday')
    if (lastCall.time_type === 'allday') {
      expect(lastCall.period_end).toBeDefined()
      expect(lastCall.period_end).toBeGreaterThanOrEqual(lastCall.period_start)
    }
  })

  it('기존 period_end 있는 allday 는 종료일 토글이 ON 상태로 시작, 종료일 input 노출', () => {
    // given: period_end 있는 allday
    const value: EventTime = {
      time_type: 'allday',
      period_start: 1700000000,
      period_end: 1700000000 + 86400 - 1,
      seconds_from_gmt: 32400,
    }
    const onChange = vi.fn()

    // when
    render(<EventTimePickerCore value={value} onChange={onChange} allowNone={false} />)

    // then: 토글이 checked, 종료일 input 존재
    const toggle = screen.getByRole('checkbox', { name: '종료일 지정' })
    expect(toggle).toBeChecked()
    expect(screen.getByLabelText('종료 날짜')).toBeInTheDocument()
  })

  it('종료일 토글 OFF 하면 종료일 input 이 사라지고 onChange 에 period_end 가 undefined', async () => {
    // given: period_end 있는 allday
    const value: EventTime = {
      time_type: 'allday',
      period_start: 1700000000,
      period_end: 1700000000 + 86400 - 1,
      seconds_from_gmt: 32400,
    }
    const onChange = vi.fn()

    render(<EventTimePickerCore value={value} onChange={onChange} allowNone={false} />)

    // when: 토글 OFF 클릭
    const toggle = screen.getByRole('checkbox', { name: '종료일 지정' })
    await userEvent.click(toggle)

    // then: onChange 에서 period_end 가 사라진 allday 로 호출
    const lastCall = onChange.mock.calls.at(-1)?.[0] as EventTime
    expect(lastCall).toBeTruthy()
    expect(lastCall.time_type).toBe('allday')
    if (lastCall.time_type === 'allday') {
      expect(lastCall.period_end).toBeUndefined()
    }
  })
})
