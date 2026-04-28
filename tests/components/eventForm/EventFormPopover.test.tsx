import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EventFormPopover } from '../../../src/components/eventForm/EventFormPopover'
import { useEventFormStore } from '../../../src/stores/eventFormStore'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'

vi.mock('../../../src/stores/eventFormStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/stores/eventFormStore')>()
  return { ...actual, useEventFormStore: vi.fn() }
})

vi.mock('../../../src/repositories/caches/eventTagListCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/repositories/caches/eventTagListCache')>()
  return { ...actual, useEventTagListCache: vi.fn() }
})

const mockCloseForm = vi.fn()
const mockSave = vi.fn()
const mockSetName = vi.fn()
const mockSetPlace = vi.fn()
const mockSetUrl = vi.fn()
const mockSetMemo = vi.fn()

const defaultStoreValues = {
  isOpen: false,
  anchorRect: null,
  eventType: 'todo' as const,
  name: '',
  eventTagId: null,
  eventTime: null,
  repeating: null,
  notifications: [],
  place: '',
  url: '',
  memo: '',
  saving: false,
  error: null,
  closeForm: mockCloseForm,
  save: mockSave,
  setName: mockSetName,
  setEventType: vi.fn(),
  setEventTagId: vi.fn(),
  setEventTime: vi.fn(),
  setRepeating: vi.fn(),
  setNotifications: vi.fn(),
  setPlace: mockSetPlace,
  setUrl: mockSetUrl,
  setMemo: mockSetMemo,
  openForm: vi.fn(),
}

function mockStore(overrides: Partial<typeof defaultStoreValues> = {}) {
  const state = { ...defaultStoreValues, ...overrides }

  // useEventFormStore with selector
  vi.mocked(useEventFormStore).mockImplementation(((sel?: any) => {
    if (typeof sel === 'function') return sel(state)
    return state
  }) as any)
}

function mockTagStore() {
  const tagState = {
    tags: new Map(),
    defaultTagColors: null,
    fetchAll: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deleteTagAndEvents: vi.fn(),
    reset: vi.fn(),
  }

  const mockFn = vi.mocked(useEventTagListCache) as any
  mockFn.mockImplementation((sel?: any) => {
    if (typeof sel === 'function') return sel(tagState)
    return tagState
  })
  mockFn.getState = () => tagState
}

describe('EventFormPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTagStore()
  })

  it('isOpen이 false이면 아무것도 렌더링하지 않는다', () => {
    // given
    mockStore({ isOpen: false })

    // when
    const { container } = render(<MemoryRouter><EventFormPopover /></MemoryRouter>)

    // then
    expect(container).toBeEmptyDOMElement()
  })

  it('isOpen이 true이면 폼 카드가 렌더링된다', () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(<MemoryRouter><EventFormPopover /></MemoryRouter>)

    // then
    expect(screen.getByTestId('event-form-backdrop')).toBeInTheDocument()
  })

  it('이름 입력 필드가 표시된다', () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(<MemoryRouter><EventFormPopover /></MemoryRouter>)

    // then
    expect(screen.getByPlaceholderText('이벤트 이름 추가')).toBeInTheDocument()
  })

  it('저장 버튼이 표시된다', () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(<MemoryRouter><EventFormPopover /></MemoryRouter>)

    // then
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })

  it('백드롭을 클릭해도 팝오버는 닫히지 않는다', async () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(
      <MemoryRouter>
        <EventFormPopover />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByTestId('event-form-backdrop'))

    // then: 팝오버가 닫히지 않아 backdrop이 여전히 존재하고 닫기 콜백도 호출되지 않음
    expect(screen.getByTestId('event-form-backdrop')).toBeInTheDocument()
    expect(mockCloseForm).not.toHaveBeenCalled()
  })

  it('이름이 비어있을 때 X 버튼 클릭 시 컨펌 없이 즉시 닫힌다', async () => {
    // given
    mockStore({ isOpen: true, name: '' })

    // when
    render(
      <MemoryRouter>
        <EventFormPopover />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByTestId('event-form-close-btn'))

    // then: 컨펌 없이 closeForm 호출
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockCloseForm).toHaveBeenCalled()
  })

  it('이름이 입력된 상태에서 X 버튼 클릭 시 컨펌 다이얼로그가 표시된다', async () => {
    // given
    mockStore({ isOpen: true, name: '회식' })

    // when
    render(
      <MemoryRouter>
        <EventFormPopover />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByTestId('event-form-close-btn'))

    // then: 컨펌 다이얼로그 표시, closeForm은 아직 호출되지 않음
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mockCloseForm).not.toHaveBeenCalled()
  })

  it('컨펌 다이얼로그에서 "떠나기"를 누르면 팝오버가 닫힌다', async () => {
    // given
    mockStore({ isOpen: true, name: '회식' })

    // when
    render(
      <MemoryRouter>
        <EventFormPopover />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByTestId('event-form-close-btn'))
    await userEvent.click(screen.getByRole('button', { name: '떠나기' }))

    // then
    expect(mockCloseForm).toHaveBeenCalled()
  })

  it('컨펌 다이얼로그에서 "취소"를 누르면 컨펌만 사라지고 팝오버는 유지된다', async () => {
    // given
    mockStore({ isOpen: true, name: '회식' })

    // when
    render(
      <MemoryRouter>
        <EventFormPopover />
      </MemoryRouter>
    )
    await userEvent.click(screen.getByTestId('event-form-close-btn'))
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockCloseForm).not.toHaveBeenCalled()
    expect(screen.getByTestId('event-form-backdrop')).toBeInTheDocument()
  })
})
