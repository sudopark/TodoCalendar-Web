import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventFormPopover } from '../../../src/components/eventForm/EventFormPopover'
import { useEventFormStore } from '../../../src/stores/eventFormStore'
import { useEventTagStore } from '../../../src/stores/eventTagStore'

vi.mock('../../../src/stores/eventFormStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/stores/eventFormStore')>()
  return { ...actual, useEventFormStore: vi.fn() }
})

vi.mock('../../../src/stores/eventTagStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/stores/eventTagStore')>()
  return { ...actual, useEventTagStore: vi.fn() }
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
    getColorForTagId: () => '#4A90D9',
    fetchAll: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deleteTagAndEvents: vi.fn(),
    reset: vi.fn(),
  }

  const mockFn = vi.mocked(useEventTagStore) as any
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
    const { container } = render(<EventFormPopover />)

    // then
    expect(container).toBeEmptyDOMElement()
  })

  it('isOpen이 true이면 폼 카드가 렌더링된다', () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(<EventFormPopover />)

    // then
    expect(screen.getByTestId('event-form-backdrop')).toBeInTheDocument()
  })

  it('이름 입력 필드가 표시된다', () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(<EventFormPopover />)

    // then
    expect(screen.getByPlaceholderText('이름')).toBeInTheDocument()
  })

  it('저장 버튼이 표시된다', () => {
    // given
    mockStore({ isOpen: true })

    // when
    render(<EventFormPopover />)

    // then
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })
})
