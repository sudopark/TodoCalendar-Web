import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ForemostEventBanner, type ForemostEventBannerProps } from '../../src/components/ForemostEventBanner'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import type { CalendarEvent } from '../../src/domain/functions/eventTime'

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

function renderComponent(props: Partial<ForemostEventBannerProps> = {}) {
  return render(
    <MemoryRouter>
      <ForemostEventBanner
        foremostEvent={props.foremostEvent ?? null}
        onEventClick={props.onEventClick}
      />
    </MemoryRouter>
  )
}

describe('ForemostEventBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventTagListCache.getState().reset()
  })

  it('고정 이벤트가 없으면 아무것도 렌더링하지 않는다', () => {
    // given: foremostEvent = null
    const { container } = renderComponent({ foremostEvent: null })

    expect(container.firstChild).toBeNull()
  })

  it('고정 이벤트가 있으면 이벤트 이름을 배너에 표시한다', () => {
    // given: foremostEvent에 todo 이벤트가 있음
    const todo = { uuid: 'fe1', name: '중요한 할 일', is_current: false, event_time: null }
    const foremostEvent = { event_id: 'fe1', is_todo: true, event: todo }

    renderComponent({ foremostEvent: foremostEvent as any })

    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
    expect(screen.getByTestId('foremost-banner')).toBeInTheDocument()
  })

  it('배너를 클릭하면 onEventClick이 todo 타입으로 호출된다', async () => {
    // given: foremostEvent에 todo가 있음, onEventClick mock
    const todo = { uuid: 'fe-nav', name: '고정 이벤트', is_current: false, event_time: null }
    const foremostEvent = { event_id: 'fe-nav', is_todo: true, event: todo }

    renderComponent({ foremostEvent: foremostEvent as any, onEventClick: mockOnEventClick })
    await userEvent.click(screen.getByTestId('foremost-banner'))

    expect(mockOnEventClick).toHaveBeenCalledOnce()
    const [calEvent] = mockOnEventClick.mock.calls[0] as [CalendarEvent]
    expect(calEvent).toMatchObject({ type: 'todo', event: todo })
  })
})
