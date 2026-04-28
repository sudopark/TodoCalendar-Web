import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingPickerShadcn } from '../../../src/components/eventForm/RepeatingPickerShadcn'
import type { EventTime, Repeating } from '../../../src/models'

describe('RepeatingPickerShadcn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('eventTime이 없으면 반복 옵션이 렌더링되지 않는다', () => {
    // given
    const { container } = render(
      <RepeatingPickerShadcn
        eventTime={null}
        repeating={null}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(container.innerHTML).toBe('')
  })

  it('반복 활성화하면 기본 옵션(매일)이 설정된다', async () => {
    // given
    const atTime: EventTime = { time_type: 'at', timestamp: 1743375600 }
    const mockSetRepeating = vi.fn()
    render(
      <RepeatingPickerShadcn
        eventTime={atTime}
        repeating={null}
        onRepeatingChange={mockSetRepeating}
      />
    )

    // when
    const checkbox = screen.getByRole('checkbox', { name: /반복/i })
    await userEvent.click(checkbox)

    // then: onRepeatingChange가 every_day 기본 옵션으로 호출됨
    expect(mockSetRepeating).toHaveBeenCalled()
    const called = mockSetRepeating.mock.calls.at(-1)?.[0]
    expect(called).toMatchObject({
      start: 1743375600,
      option: expect.objectContaining({ optionType: 'every_day', interval: 1 }),
    })
  })

  it('반복 비활성화하면 null이 설정된다', async () => {
    // given
    const atTime: EventTime = { time_type: 'at', timestamp: 1743375600 }
    const repeating: Repeating = {
      start: 1743375600,
      option: { optionType: 'every_day', interval: 1 },
    }
    const mockSetRepeating = vi.fn()
    render(
      <RepeatingPickerShadcn
        eventTime={atTime}
        repeating={repeating}
        onRepeatingChange={mockSetRepeating}
      />
    )

    // when — checkbox starts checked because repeating is non-null
    const checkbox = screen.getByRole('checkbox', { name: /반복/i })
    await userEvent.click(checkbox)

    // then
    expect(mockSetRepeating).toHaveBeenCalled()
    const called = mockSetRepeating.mock.calls.at(-1)?.[0]
    expect(called).toBeNull()
  })
})
