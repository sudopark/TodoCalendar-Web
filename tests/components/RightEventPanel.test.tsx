import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RightEventPanel, type RightEventPanelProps } from '../../src/components/RightEventPanel'
import { RepositoriesProvider } from '../../src/composition/RepositoriesProvider'
import type { Repositories } from '../../src/composition/container'
import type { EventRepository } from '../../src/repositories/EventRepository'

vi.mock('../../src/repositories/caches/eventTagListCache', () => ({
  useEventTagListCache: vi.fn((selector: any) => selector({ tags: new Map() })),
  DEFAULT_TAG_ID: 'default',
  HOLIDAY_TAG_ID: 'holiday',
}))
vi.mock('../../src/api/todoApi', () => ({
  todoApi: { createTodo: vi.fn(), getCurrentTodos: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../../src/firebase', () => ({
  getAuthInstance: vi.fn(() => ({})),
  db: {},
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))
vi.mock('../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))
vi.mock('../../src/api/eventTagApi', () => ({ eventTagApi: { getAllTags: vi.fn(async () => []) } }))
vi.mock('../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}))
vi.mock('../../src/repositories/caches/settingsCache', () => ({
  useSettingsCache: vi.fn((selector: any) => selector({
    calendarAppearance: {
      weekStartDay: 0, accentDays: { holiday: true, saturday: false, sunday: true },
      eventDisplayLevel: 'medium', rowHeight: 70, eventFontSizeWeight: 0, showEventNames: true,
      eventListFontSizeWeight: 0, showHolidayInEventList: true, showLunarCalendar: false, showUncompletedTodos: true,
    },
    eventDefaults: { defaultTagId: null, defaultNotificationSeconds: null, defaultAllDayNotificationSeconds: null },
    timezone: { timezone: 'UTC', systemTimezone: 'UTC', isCustom: false },
    notification: { permission: 'default', fcmToken: null },
    setAppearance: vi.fn(), resetAppearanceToDefaults: vi.fn(),
    setEventDefaults: vi.fn(), setTimezone: vi.fn(),
    setNotificationPermission: vi.fn(), setFcmToken: vi.fn(),
    requestNotificationPermission: vi.fn(), reset: vi.fn(),
  })),
}))

import { useIsMobile } from '../../src/hooks/useIsMobile'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeFakeEventRepo(): EventRepository {
  return { completeTodo: vi.fn(async () => ({ uuid: 'done', done_at: 0 })) } as unknown as EventRepository
}

function makeFakeRepos(): Repositories {
  return {
    eventRepo: makeFakeEventRepo(),
    eventDetailRepo: {} as any,
    tagRepo: {} as any,
    holidayRepo: {} as any,
    doneTodoRepo: {} as any,
    foremostEventRepo: {} as any,
    authRepo: {} as any,
    settingsRepo: {} as any,
  }
}

function defaultProps(overrides: Partial<RightEventPanelProps> = {}): RightEventPanelProps {
  return {
    selectedDate: null,
    rightPanelMode: 'dayEvents',
    foremostEvent: null,
    currentTodos: [],
    uncompletedTodos: [],
    showUncompletedTodos: true,
    showHolidayInEventList: true,
    showLunarCalendar: false,
    eventsByDate: new Map(),
    isTagHidden: () => false,
    getHolidayNames: () => [],
    onReloadUncompletedTodos: async () => {},
    onToggleRightPanel: vi.fn(),
    onOpenArchivePanel: vi.fn(),
    onEventClick: vi.fn(),
    ...overrides,
  }
}

function renderComponent(props: Partial<RightEventPanelProps> = {}) {
  return render(
    <RepositoriesProvider value={makeFakeRepos()}>
      <MemoryRouter>
        <RightEventPanel {...defaultProps(props)} />
      </MemoryRouter>
    </RepositoriesProvider>
  )
}

describe('RightEventPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useIsMobile).mockReturnValue(false)
  })

  it('QuickTodoInput과 CreateEventButton이 항상 표시된다', () => {
    renderComponent()

    expect(screen.getByPlaceholderText('할 일 추가...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '새 이벤트' })).toBeInTheDocument()
  })

  it('패널 닫기 버튼이 표시된다', () => {
    renderComponent()

    // common.close i18n key 또는 fallback '패널 닫기' 로 렌더됨
    expect(screen.getByRole('button', { name: /닫기|패널 닫기/ })).toBeInTheDocument()
  })

  it('foremostEvent가 없으면 ForemostEventBanner가 표시되지 않는다', () => {
    // given: foremost event 없음
    renderComponent({ foremostEvent: null })

    // then: 고정 이벤트 배너 없음
    expect(screen.queryByTestId('foremost-banner')).not.toBeInTheDocument()
  })

  it('foremostEvent가 있으면 ForemostEventBanner가 표시된다', () => {
    // given: foremost event 존재
    const todo = { uuid: 'fe1', name: '중요한 할 일', is_current: false, event_time: null }
    const foremostEvent = { event_id: 'fe1', is_todo: true, event: todo }

    renderComponent({ foremostEvent: foremostEvent as any })

    // then: 배너가 표시됨
    expect(screen.getByTestId('foremost-banner')).toBeInTheDocument()
    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
  })

  it('selectedDate가 없으면 날짜 헤더와 DayEventList가 표시되지 않는다', () => {
    // given: 날짜 미선택
    renderComponent({ selectedDate: null })

    // then: 날짜 관련 섹션 없음 (이벤트 없음 메시지도 없음)
    expect(screen.queryByText('이벤트가 없습니다')).not.toBeInTheDocument()
  })

  it('selectedDate가 있으면 날짜 헤더와 DayEventList가 표시된다', () => {
    // given: 날짜 선택됨
    const date = new Date(2024, 2, 15) // 2024-03-15
    renderComponent({ selectedDate: date, eventsByDate: new Map() })

    // then: 날짜 헤더가 표시되고 DayEventList 영역(이벤트 없음 메시지)이 보임
    expect(screen.getByText('이벤트가 없습니다')).toBeInTheDocument()
    const heading = screen.getByText(/3월|March/)
    expect(heading).toBeInTheDocument()
  })

  it('QuickTodoInput이 하단 고정 영역에 표시된다', () => {
    renderComponent()

    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('selectedDate가 없어도 currentTodos의 항목이 표시된다', () => {
    // given: 날짜 미선택, currentTodo 존재
    const todos = [{ uuid: 'ct1', name: '현재 할 일', is_current: true, event_time: null }] as any[]
    renderComponent({ selectedDate: null, currentTodos: todos })

    // then: 날짜 섹션 없이도 currentTodo가 보임
    expect(screen.getByText('현재 할 일')).toBeInTheDocument()
    expect(screen.queryByText('이벤트가 없습니다')).not.toBeInTheDocument()
  })

  it('데스크톱에서는 패널 닫기 버튼이 표시된다', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    renderComponent()
    expect(screen.getByRole('button', { name: /닫기|패널 닫기/ })).toBeInTheDocument()
  })

  it('모바일에서는 패널 닫기 버튼이 표시되지 않는다', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    renderComponent()
    expect(screen.queryByRole('button', { name: /닫기|패널 닫기/ })).not.toBeInTheDocument()
  })
})
