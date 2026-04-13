import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingPickerShadcn } from '../../../src/components/eventForm/RepeatingPickerShadcn'
import { useEventFormStore } from '../../../src/stores/eventFormStore'

vi.mock('../../../src/stores/eventFormStore', () => ({ useEventFormStore: vi.fn() }))

const mockSetRepeating = vi.fn()

function mockStore(overrides: {
  eventTime?: import('../../../src/models').EventTime | null
  repeating?: import('../../../src/models').Repeating | null
}) {
  vi.mocked(useEventFormStore).mockImplementation((sel: any) =>
    sel({
      eventTime: overrides.eventTime ?? null,
      repeating: overrides.repeating ?? null,
      setRepeating: mockSetRepeating,
    })
  )
}

describe('RepeatingPickerShadcn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('eventTime이 없으면 반복 옵션이 렌더링되지 않는다', () => {
    // given
    mockStore({ eventTime: null })

    // when
    const { container } = render(<RepeatingPickerShadcn />)

    // then
    expect(container.innerHTML).toBe('')
  })

  it('반복 활성화하면 기본 옵션(매일)이 설정된다', async () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: 1743375600 }
    mockStore({ eventTime: atTime, repeating: null })
    render(<RepeatingPickerShadcn />)

    // when
    const checkbox = screen.getByRole('checkbox', { name: /반복/i })
    await userEvent.click(checkbox)

    // then
    expect(mockSetRepeating).toHaveBeenCalledWith(
      expect.objectContaining({
        start: 1743375600,
        option: expect.objectContaining({ optionType: 'every_day', interval: 1 }),
      })
    )
  })

  it('반복 비활성화하면 null이 설정된다', async () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: 1743375600 }
    const repeating = {
      start: 1743375600,
      option: { optionType: 'every_day' as const, interval: 1 },
    }
    mockStore({ eventTime: atTime, repeating })
    render(<RepeatingPickerShadcn />)

    // when — checkbox starts checked because repeating is non-null
    const checkbox = screen.getByRole('checkbox', { name: /반복/i })
    await userEvent.click(checkbox)

    // then
    expect(mockSetRepeating).toHaveBeenCalledWith(null)
  })
})
