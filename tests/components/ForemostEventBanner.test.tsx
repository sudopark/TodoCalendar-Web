import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ForemostEventBanner } from '../../src/components/ForemostEventBanner'
import { useForemostEventCache } from '../../src/repositories/caches/foremostEventCache'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'

vi.mock('../../src/repositories/caches/foremostEventCache', () => ({ useForemostEventCache: vi.fn() }))
vi.mock('../../src/api/foremostApi', () => ({
  foremostApi: { getForemostEvent: async () => null },
}))
vi.mock('../../src/api/settingApi', () => ({
  settingApi: { getDefaultTagColors: async () => null },
}))
vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: async () => [] },
}))

const mockOnEventClick = vi.fn()

function renderComponent(onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void) {
  return render(
    <MemoryRouter>
      <ForemostEventBanner onEventClick={onEventClick} />
    </MemoryRouter>
  )
}

describe('ForemostEventBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventTagListCache.getState().reset()
  })

  it('고정 이벤트가 없으면 아무것도 렌더링하지 않는다', () => {
    vi.mocked(useForemostEventCache).mockImplementation((selector: any) =>
      selector({ foremostEvent: null, fetch: vi.fn() })
    )

    const { container } = renderComponent()

    expect(container.firstChild).toBeNull()
  })

  it('고정 이벤트가 있으면 이벤트 이름을 배너에 표시한다', () => {
    const todo = { uuid: 'fe1', name: '중요한 할 일', is_current: false, event_time: null }
    vi.mocked(useForemostEventCache).mockImplementation((selector: any) =>
      selector({ foremostEvent: { event_id: 'fe1', is_todo: true, event: todo }, fetch: vi.fn() })
    )

    renderComponent()

    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
    expect(screen.getByText('Foremost Event')).toBeInTheDocument()
  })

  it('배너를 클릭하면 onEventClick이 todo 타입으로 호출된다', async () => {
    const todo = { uuid: 'fe-nav', name: '고정 이벤트', is_current: false, event_time: null }
    vi.mocked(useForemostEventCache).mockImplementation((selector: any) =>
      selector({ foremostEvent: { event_id: 'fe-nav', is_todo: true, event: todo }, fetch: vi.fn() })
    )

    renderComponent(mockOnEventClick)
    await userEvent.click(screen.getByTestId('foremost-banner'))

    expect(mockOnEventClick).toHaveBeenCalledOnce()
    const [calEvent] = mockOnEventClick.mock.calls[0]
    expect(calEvent).toMatchObject({ type: 'todo', event: todo })
  })
})
