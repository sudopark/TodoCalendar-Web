import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useOpenEventForm } from '../../src/hooks/useOpenEventForm'

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}))
import { useIsMobile } from '../../src/hooks/useIsMobile'

const openFormMock = vi.fn()
vi.mock('../../src/stores/eventFormStore', () => ({
  useEventFormStore: (selector: any) => selector({ openForm: openFormMock }),
}))

function LocationProbe({ onLocation }: { onLocation: (path: string) => void }) {
  const loc = useLocation()
  onLocation(loc.pathname)
  return null
}

function setup() {
  let path = ''
  const { result } = renderHook(() => useOpenEventForm(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/*" element={<><LocationProbe onLocation={p => (path = p)} />{children as any}</>} />
        </Routes>
      </MemoryRouter>
    ),
  })
  return { result, getPath: () => path }
}

describe('useOpenEventForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  it('데스크톱이면 eventFormStore.openForm으로 위임한다', () => {
    // given
    vi.mocked(useIsMobile).mockReturnValue(false)
    const { result } = setup()
    const rect = { left: 0, top: 0, right: 0, bottom: 0 } as DOMRect

    // when
    act(() => result.current(rect, 'todo'))

    // then
    expect(openFormMock).toHaveBeenCalled()
  })

  it('모바일이고 type=todo이면 /todos/new로 이동한다', () => {
    // given
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { result, getPath } = setup()

    // when
    act(() => result.current(null, 'todo'))

    // then
    expect(getPath()).toBe('/todos/new')
    expect(openFormMock).not.toHaveBeenCalled()
  })

  it('모바일이고 type=schedule이면 /schedules/new로 이동한다', () => {
    // given
    vi.mocked(useIsMobile).mockReturnValue(true)
    const { result, getPath } = setup()

    // when
    act(() => result.current(null, 'schedule'))

    // then
    expect(getPath()).toBe('/schedules/new')
  })
})
