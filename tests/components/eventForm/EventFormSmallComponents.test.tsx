import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventTypeToggle } from '../../../src/components/eventForm/EventTypeToggle'
import { DDayBadge } from '../../../src/components/eventForm/DDayBadge'
import { NotificationPickerDropdown } from '../../../src/components/eventForm/NotificationPickerDropdown'
import { useEventFormStore } from '../../../src/stores/eventFormStore'

vi.mock('../../../src/stores/eventFormStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/stores/eventFormStore')>()
  return { ...actual, useEventFormStore: vi.fn() }
})

const mockSetEventType = vi.fn()
const mockSetNotifications = vi.fn()

function mockStore(overrides: {
  eventType?: 'todo' | 'schedule'
  eventTime?: import('../../../src/models').EventTime | null
  notifications?: import('../../../src/models').NotificationOption[]
}) {
  vi.mocked(useEventFormStore).mockImplementation((sel: any) =>
    sel({
      eventType: overrides.eventType ?? 'todo',
      eventTime: overrides.eventTime ?? null,
      notifications: overrides.notifications ?? [],
      setEventType: mockSetEventType,
      setNotifications: mockSetNotifications,
    }),
  )
}

describe('EventTypeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('todo 타입일 때 "예" 버튼이 렌더링된다', () => {
    // given
    mockStore({ eventType: 'todo' })

    // when
    render(<EventTypeToggle />)

    // then: Todo 라벨과 "예" 토글 버튼이 표시된다
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /예/i })).toBeInTheDocument()
  })
})

describe('DDayBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('eventTime이 없으면 아무것도 렌더링하지 않는다', () => {
    // given
    mockStore({ eventTime: null })

    // when
    const { container } = render(<DDayBadge />)

    // then
    expect(container).toBeEmptyDOMElement()
  })

  it('eventTime이 있으면 D-day 배지가 표시된다', () => {
    // given — 오늘부터 3일 뒤 timestamp
    const threeDaysFromNow = Math.floor(Date.now() / 1000) + 3 * 86400
    mockStore({ eventTime: { time_type: 'at', timestamp: threeDaysFromNow } })

    // when
    render(<DDayBadge />)

    // then — D-3 (3일 남음)
    expect(screen.getByText(/^D-/)).toBeInTheDocument()
  })
})

describe('NotificationPickerDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('eventTime이 없으면 알림 버튼이 비활성화된다', () => {
    // given
    mockStore({ eventTime: null, notifications: [] })

    // when
    render(<NotificationPickerDropdown />)

    // then
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('eventTime이 있으면 알림 버튼이 활성화된다', () => {
    // given
    const atTime = { time_type: 'at' as const, timestamp: Math.floor(Date.now() / 1000) + 3600 }
    mockStore({ eventTime: atTime, notifications: [] })

    // when
    render(<NotificationPickerDropdown />)

    // then
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
  })
})
