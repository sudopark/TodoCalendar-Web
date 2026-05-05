/**
 * MainPage — 비반복 이벤트 삭제 확인 다이얼로그 테스트
 *
 * 모킹 경계:
 * - useMainViewModel: 칼달/설정/태그 등 의존 스토어·훅이 너무 많아 API 셋업 비용이
 *   과도함 → CLAUDE.md 스토어 모킹 허용 조건 해당
 * - todoApi / scheduleApi: 실제 API 경계에서 모킹 (삭제 흐름 검증)
 * - 이벤트 데이터: useCalendarEventsCache.addEvent()로 캐시에 직접 주입
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MainPage } from '../../../src/pages/Main/MainPage'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { EventRepository } from '../../../src/repositories/EventRepository'
import { useCalendarEventsCache } from '../../../src/repositories/caches/calendarEventsCache'
import type { Repositories } from '../../../src/composition/container'
import type { CalendarEvent } from '../../../src/domain/functions/eventTime'

// ── Firebase / Auth 초기화 차단 ────────────────────────────────────────
vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

// ── API 경계 모킹 ──────────────────────────────────────────────────────
vi.mock('../../../src/api/todoApi', () => ({
  todoApi: {
    getTodos: vi.fn(async () => []),
    getCurrentTodos: vi.fn(async () => []),
    getUncompletedTodos: vi.fn(async () => []),
    deleteTodo: vi.fn(async () => undefined),
    patchTodo: vi.fn(),
    updateTodo: vi.fn(),
  },
}))
vi.mock('../../../src/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedules: vi.fn(async () => []),
    deleteSchedule: vi.fn(async () => undefined),
    updateSchedule: vi.fn(),
    excludeRepeating: vi.fn(),
  },
}))
vi.mock('../../../src/api/eventDetailApi', () => ({
  eventDetailApi: {
    getEventDetail: vi.fn(async () => ({ place: null, url: null, memo: null })),
    updateEventDetail: vi.fn(),
    deleteEventDetail: vi.fn(),
  },
}))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: { getAllTags: async () => [] } }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))

// ── useMainViewModel 모킹 (캘린더/설정/태그 등 모든 스토어 의존성 차단) ──
vi.mock('../../../src/pages/Main/useMainViewModel', () => ({ useMainViewModel: vi.fn() }))

// ── useIsMobile: 데스크톱 고정 (EventDetailPopover floating 카드 모드) ──
vi.mock('../../../src/hooks/useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }))

import { useMainViewModel } from '../../../src/pages/Main/useMainViewModel'

// ── MainViewModel 기본 스텁 ────────────────────────────────────────────
const noop = () => {}
const asyncNoop = async () => {}
const baseVm = {
  currentMonth: new Date(2025, 4, 1),
  sidebarMonth: new Date(2025, 4, 1),
  monthEvents: [],
  eventsByDate: new Map(),
  loading: false,
  weekStartDay: 0 as const,
  eventDisplayLevel: 'medium' as const,
  sidebarOpen: false,
  selectedDate: null,
  getHolidayNames: () => [],
  rightPanelOpen: false,
  rightPanelMode: 'events' as const,
  foremostEvent: null,
  currentTodos: [],
  uncompletedTodos: [],
  showUncompletedTodos: false,
  showHolidayInEventList: false,
  showLunarCalendar: false,
  tags: [],
  isTagHidden: () => false,
  setSelectedDate: noop,
  setSidebarMonth: noop,
  toggleSidebar: noop,
  goToPrevMonth: noop,
  goToNextMonth: noop,
  goToToday: noop,
  toggleRightPanel: noop,
  openArchivePanel: noop,
  exitArchivePanel: noop,
  openEventForm: noop,
  refresh: noop,
  reloadUncompletedTodos: asyncNoop,
}

// ── CalendarEvent 팩토리 ──────────────────────────────────────────────

function makeTodoCalEvent(overrides: { repeating?: object } = {}): CalendarEvent {
  return {
    type: 'todo',
    event: {
      uuid: 'todo-abc',
      name: '테스트 할 일',
      is_current: false,
      event_tag_id: null,
      event_time: { time_type: 'at', timestamp: 1746284400 }, // 2025-05-03 KST
      repeating: (overrides.repeating as any) ?? null,
      notification_options: null,
    },
  }
}

function makeScheduleCalEvent(overrides: { repeating?: object } = {}): CalendarEvent {
  return {
    type: 'schedule',
    event: {
      uuid: 'sched-xyz',
      name: '테스트 일정',
      event_tag_id: null,
      event_time: { time_type: 'at', timestamp: 1746284400 }, // 2025-05-03 KST
      repeating: (overrides.repeating as any) ?? null,
      notification_options: null,
    },
  }
}

// ── 렌더 헬퍼 ─────────────────────────────────────────────────────────

async function makeFakeRepos(): Promise<Repositories> {
  const { todoApi } = await import('../../../src/api/todoApi')
  const { scheduleApi } = await import('../../../src/api/scheduleApi')
  return {
    eventRepo: new EventRepository({ todoApi, scheduleApi }),
    eventDetailRepo: {
      get: vi.fn(async () => ({ place: null, url: null, memo: null })),
      save: vi.fn(async (_id: string, d: unknown) => d),
      invalidate: vi.fn(),
    } as unknown as Repositories['eventDetailRepo'],
    tagRepo: {} as unknown as Repositories['tagRepo'],
    holidayRepo: {} as unknown as Repositories['holidayRepo'],
    doneTodoRepo: {} as unknown as Repositories['doneTodoRepo'],
    foremostEventRepo: {} as unknown as Repositories['foremostEventRepo'],
    authRepo: {} as unknown as Repositories['authRepo'],
    settingsRepo: {} as unknown as Repositories['settingsRepo'],
  }
}

function renderPage(repos: Repositories) {
  return render(
    <RepositoriesProvider value={repos}>
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>
    </RepositoriesProvider>
  )
}

/**
 * 이벤트 바 클릭 → 팝오버 열기 → 삭제 버튼 클릭 순서로 진행하는 헬퍼
 * MainCalendarGrid는 useCalendarEventsCache에서 이벤트를 읽어 바를 렌더하므로
 * 캐시에 직접 addEvent하여 바가 그려지도록 한다.
 */
async function openPopoverAndClickDelete(calEvent: CalendarEvent, repos: Repositories) {
  // 캐시에 이벤트 주입 → event-bar가 그려짐
  useCalendarEventsCache.getState().addEvent(calEvent)

  renderPage(repos)

  // 이벤트 바(event-bar) 중 해당 이벤트 이름을 가진 것을 클릭
  const bar = await screen.findByTestId('event-bar')
  await userEvent.click(bar)

  // 팝오버 삭제 버튼 클릭
  const deleteBtn = await screen.findByTestId('popover-delete-btn')
  await userEvent.click(deleteBtn)
}

// ── 테스트 ─────────────────────────────────────────────────────────────

describe('MainPage — 비반복 이벤트 삭제 확인 다이얼로그', () => {
  let repos: Repositories

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(useMainViewModel).mockReturnValue(baseVm as any)
    useCalendarEventsCache.getState().reset()
    repos = await makeFakeRepos()
  })

  it('비반복 Todo 삭제 버튼 클릭 시 → 확인 다이얼로그가 노출된다', async () => {
    // given: 비반복 Todo이 캘린더에 표시된 상태
    const calEvent = makeTodoCalEvent()

    // when: 이벤트 바 클릭 → 팝오버 열기 → 삭제 클릭
    await openPopoverAndClickDelete(calEvent, repos)

    // then: 확인 다이얼로그(role="dialog")가 나타난다
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('비반복 Todo — 확인 다이얼로그에서 확인 클릭 시 → 삭제가 실행되고 팝오버가 닫힌다', async () => {
    // given
    const { todoApi } = await import('../../../src/api/todoApi')
    vi.mocked(todoApi.deleteTodo).mockResolvedValue(undefined as any)

    const calEvent = makeTodoCalEvent()
    await openPopoverAndClickDelete(calEvent, repos)

    // when: 확인 다이얼로그(role="dialog") 안의 "삭제" 버튼 클릭
    const dialog = screen.getByRole('dialog')
    const confirmBtn = dialog.querySelector('button[data-variant="danger"]') as HTMLElement
    await userEvent.click(confirmBtn)

    // then: 다이얼로그가 닫히고 팝오버도 사라진다
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByTestId('popover-delete-btn')).not.toBeInTheDocument()
    })
  })

  it('비반복 Todo — 확인 다이얼로그에서 취소 클릭 시 → 삭제가 실행되지 않고 팝오버가 유지된다', async () => {
    // given
    const { todoApi } = await import('../../../src/api/todoApi')
    const calEvent = makeTodoCalEvent()
    await openPopoverAndClickDelete(calEvent, repos)

    // when: 다이얼로그에서 "취소" 클릭
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then: 다이얼로그가 닫히고, 삭제는 실행되지 않았으며, 팝오버는 여전히 열려 있다
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('popover-delete-btn')).toBeInTheDocument()
    expect(todoApi.deleteTodo).not.toHaveBeenCalled()
  })

  it('비반복 Schedule — 삭제 버튼 클릭 시 → 확인 다이얼로그가 노출된다', async () => {
    // given
    const calEvent = makeScheduleCalEvent()

    // when
    await openPopoverAndClickDelete(calEvent, repos)

    // then
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('반복 Todo — 삭제 클릭 시 RepeatingScopeDialog가 노출되고 ConfirmDialog는 뜨지 않는다', async () => {
    // given: 반복 이벤트
    const calEvent = makeTodoCalEvent({
      repeating: {
        start: 1746284400,
        option: { optionType: 'every_day', interval: 1 },
      },
    })

    // when
    await openPopoverAndClickDelete(calEvent, repos)

    // then: RepeatingScopeDialog가 표시됨
    await waitFor(() => {
      expect(screen.getByText('반복 할일 삭제')).toBeInTheDocument()
    })

    // ConfirmDialog(role="dialog")가 아닌 RepeatingScopeDialog — 삭제 확인 메시지는 없음
    // RepeatingScopeDialog는 별도 UI로 범위 선택을 제공, ConfirmDialog가 아님
    expect(screen.queryByText(/이벤트를 삭제할까요/)).not.toBeInTheDocument()
  })
})
