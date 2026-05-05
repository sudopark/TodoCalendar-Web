import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { EventDetailPopover } from '../../../src/components/EventDetail/EventDetailPopover'
import { useEventTagListCache } from '../../../src/repositories/caches/eventTagListCache'
import type { CalendarEvent } from '../../../src/domain/functions/eventTime'
import type { EventTime, Repeating, NotificationOption, EventDetail } from '../../../src/models'
import type { EventDetailRepository } from '../../../src/repositories/EventDetailRepository'
import type { Repositories } from '../../../src/composition/container'
import { RepositoriesProvider } from '../../../src/composition/RepositoriesProvider'
import { useIsMobile } from '../../../src/hooks/useIsMobile'

vi.mock('../../../src/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}))

vi.mock('../../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn(async () => []) },
}))

vi.mock('../../../src/api/eventDetailApi', () => ({ eventDetailApi: {} }))
vi.mock('../../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../../src/api/scheduleApi', () => ({ scheduleApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))
vi.mock('../../../src/api/doneTodoApi', () => ({ doneTodoApi: {} }))
vi.mock('../../../src/api/foremostApi', () => ({ foremostApi: {} }))
vi.mock('../../../src/api/holidayApi', () => ({ holidayApi: {} }))
vi.mock('../../../src/api/firebaseAuthApi', () => ({ firebaseAuthApi: {} }))
vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

const mockAnchorRect: DOMRect = {
  top: 100,
  bottom: 120,
  left: 50,
  right: 200,
  width: 150,
  height: 20,
  x: 50,
  y: 100,
  toJSON: () => ({}),
}

function makeTodoEvent(overrides: {
  name?: string
  tagId?: string | null
  eventTime?: EventTime | null
  repeating?: Repeating | null
  notifications?: NotificationOption[] | null
} = {}): CalendarEvent {
  return {
    type: 'todo',
    event: {
      uuid: 'todo-123',
      name: overrides.name ?? '테스트 할 일',
      is_current: false,
      event_tag_id: overrides.tagId ?? null,
      event_time: overrides.eventTime ?? { time_type: 'at', timestamp: 1710480600 },
      repeating: overrides.repeating ?? null,
      notification_options: overrides.notifications ?? null,
    },
  }
}

function makeScheduleEvent(overrides: {
  name?: string
  tagId?: string | null
  eventTime?: EventTime | null
  repeating?: Repeating | null
  notifications?: NotificationOption[] | null
} = {}): CalendarEvent {
  return {
    type: 'schedule',
    event: {
      uuid: 'schedule-456',
      name: overrides.name ?? '테스트 일정',
      event_tag_id: overrides.tagId ?? null,
      event_time: overrides.eventTime ?? { time_type: 'at', timestamp: 1710480600 },
      repeating: overrides.repeating ?? null,
      notification_options: overrides.notifications ?? null,
    },
  }
}

function createFakeDetailRepo(detail: { place?: EventDetail['place']; url?: string | null; memo?: string | null } = {}): EventDetailRepository {
  return {
    get: vi.fn(async () => ({ place: detail.place ?? null, url: detail.url ?? null, memo: detail.memo ?? null })),
    save: vi.fn(async (_, d) => d),
    invalidate: vi.fn(),
  } as unknown as EventDetailRepository
}

function createFakeRepos(detailRepo?: EventDetailRepository): Repositories {
  return {
    eventRepo: {} as unknown as Repositories['eventRepo'],
    eventDetailRepo: detailRepo ?? createFakeDetailRepo(),
    tagRepo: {} as unknown as Repositories['tagRepo'],
    holidayRepo: {} as unknown as Repositories['holidayRepo'],
    doneTodoRepo: {} as unknown as Repositories['doneTodoRepo'],
    foremostEventRepo: {} as unknown as Repositories['foremostEventRepo'],
    authRepo: {} as unknown as Repositories['authRepo'],
    settingsRepo: {} as unknown as Repositories['settingsRepo'],
  }
}

interface RenderOpts {
  handlers?: { onClose?: () => void; onEdit?: () => void; onDelete?: () => void }
  detailData?: { place?: EventDetail['place']; url?: string | null; memo?: string | null }
  /** anchorRect 부재 (모바일 또는 fallback 검증용)를 표현하려면 noAnchor: true */
  noAnchor?: boolean
}

function renderPopover(
  calEvent: CalendarEvent,
  arg2?: RenderOpts['handlers'] | RenderOpts,
  detailData: NonNullable<RenderOpts['detailData']> = {},
) {
  // 기존 호출(handlers 위치 인자) 호환 + 새 옵션 객체 둘 다 지원
  const opts: RenderOpts = arg2 && (
    'handlers' in arg2 || 'detailData' in arg2 || 'noAnchor' in arg2
  ) ? (arg2 as RenderOpts) : { handlers: arg2 as RenderOpts['handlers'], detailData }
  const handlers = opts.handlers ?? {}
  const data = opts.detailData ?? detailData
  const onClose = handlers.onClose ?? vi.fn()
  const onEdit = handlers.onEdit ?? vi.fn()
  const onDelete = handlers.onDelete ?? vi.fn()
  const repos = createFakeRepos(createFakeDetailRepo(data))
  return render(
    <MemoryRouter>
      <RepositoriesProvider value={repos}>
        <EventDetailPopover
          calEvent={calEvent}
          anchorRect={opts.noAnchor ? undefined : mockAnchorRect}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </RepositoriesProvider>
    </MemoryRouter>,
  )
}

describe('EventDetailPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useIsMobile).mockReturnValue(false)
    useEventTagListCache.setState({ tags: new Map() })
  })

  it('이벤트 이름과 시간을 표시한다', async () => {
    // given: 이름과 시간이 있는 Todo 이벤트
    const calEvent = makeTodoEvent({
      name: '중요한 할 일',
      eventTime: { time_type: 'at', timestamp: 1710480600 },
    })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: 이벤트 이름이 표시된다
    expect(screen.getByText('중요한 할 일')).toBeInTheDocument()
    // EventTimeDisplay가 렌더됨
    expect(screen.getByTestId('event-detail-popover')).toBeInTheDocument()
  })

  it('반복 정보를 표시한다', async () => {
    // given: 매일 반복 설정이 있는 일정
    const calEvent = makeTodoEvent({
      name: '매일 운동',
      repeating: { start: 1710480600, option: { optionType: 'every_day', interval: 1 } },
    })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: 반복 정보가 표시된다
    const repeatingInfo = screen.getByTestId('repeating-info')
    expect(repeatingInfo).toBeInTheDocument()
    expect(repeatingInfo).toHaveTextContent('매 1일')
  })

  it('알림 설정을 표시한다', async () => {
    // given: 알림 설정이 있는 이벤트
    const calEvent = makeTodoEvent({
      name: '알림 있는 할 일',
      notifications: [{ type: 'time', seconds: -300 }],
    })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: 알림 정보가 표시된다
    const notifInfo = screen.getByTestId('notification-info')
    expect(notifInfo).toBeInTheDocument()
    expect(notifInfo).toHaveTextContent('5분 전')
  })

  it('ViewModel을 통해 장소, URL, 메모를 로드하여 표시한다', async () => {
    // given: 추가 정보가 있는 이벤트
    const calEvent = makeTodoEvent({ name: '미팅' })

    // when: 팝오버 렌더 및 API 응답 대기
    renderPopover(calEvent, {}, { place: '서울 카페', url: 'https://example.com', memo: '미팅 메모' })

    // then: 장소, URL, 메모가 표시된다
    await waitFor(() => {
      expect(screen.getByText('서울 카페')).toBeInTheDocument()
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
      expect(screen.getByText('미팅 메모')).toBeInTheDocument()
    })
  })

  it('place가 객체(name/address/coordinate) 형태로 응답되어도 렌더 에러 없이 name이 표시된다', async () => {
    // given: 다른 클라이언트(앱)가 저장하여 place 가 객체로 오는 케이스
    const calEvent = makeTodoEvent({ name: '카페 모임' })

    // when
    renderPopover(calEvent, {}, {
      place: {
        name: '스타벅스 강남점',
        address: '서울 강남구 테헤란로 1',
        coordinate: { latitude: 37.5, longitude: 127.0 },
      },
    })

    // then: name 이 화면에 표시되고 React 에러가 발생하지 않는다
    await waitFor(() => {
      expect(screen.getByText('스타벅스 강남점')).toBeInTheDocument()
    })
  })

  it('place가 객체이고 name 이 없으면 address 가 표시된다', async () => {
    // given
    const calEvent = makeTodoEvent({ name: '약속' })

    // when
    renderPopover(calEvent, {}, {
      place: {
        name: null,
        address: '서울 종로구 종로 1',
        coordinate: { latitude: 37.57, longitude: 126.98 },
      },
    })

    // then
    await waitFor(() => {
      expect(screen.getByText('서울 종로구 종로 1')).toBeInTheDocument()
    })
  })

  it('place가 객체인데 name/address 둘 다 비어 있으면 장소 행을 표시하지 않는다', async () => {
    // given
    const calEvent = makeTodoEvent({ name: '약속' })

    // when
    renderPopover(calEvent, {}, {
      place: { name: null, address: null, coordinate: { latitude: 1, longitude: 2 } },
    })

    // then: MapPin 아이콘 행이 그려지지 않는다 (장소 텍스트가 없으므로 행 자체 미노출)
    // place 표시 영역의 정체성을 확인하기 위해 known 다른 텍스트가 안 들어왔는지 검증
    await waitFor(() => {
      expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
    })
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onClose = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 닫기 버튼 클릭
    renderPopover(calEvent, { onClose })
    await user.click(screen.getByTestId('popover-close-btn'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('수정 버튼 클릭 시 onEdit이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 수정 버튼 클릭
    renderPopover(calEvent, { onEdit })
    await user.click(screen.getByTestId('popover-edit-btn'))

    // then
    expect(onEdit).toHaveBeenCalled()
  })

  it('삭제 버튼 클릭 시 onDelete가 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 삭제 버튼 클릭
    renderPopover(calEvent, { onDelete })
    await user.click(screen.getByTestId('popover-delete-btn'))

    // then
    expect(onDelete).toHaveBeenCalled()
  })

  it('backdrop 클릭 시 onClose가 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onClose = vi.fn()
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더 후 backdrop 클릭
    renderPopover(calEvent, { onClose })
    await user.click(screen.getByTestId('popover-backdrop'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('반복 정보가 없으면 반복 섹션을 표시하지 않는다', () => {
    // given: 반복 없는 이벤트
    const calEvent = makeTodoEvent({ repeating: null })

    // when
    renderPopover(calEvent)

    // then
    expect(screen.queryByTestId('repeating-info')).not.toBeInTheDocument()
  })

  it('알림 설정이 없으면 알림 섹션을 표시하지 않는다', () => {
    // given: 알림 없는 이벤트
    const calEvent = makeTodoEvent({ notifications: null })

    // when
    renderPopover(calEvent)

    // then
    expect(screen.queryByTestId('notification-info')).not.toBeInTheDocument()
  })

  it('태그가 있으면 태그 색상 dot을 이벤트 이름 옆에 표시한다', () => {
    // given: 태그가 있는 이벤트
    const tagId = 'tag-blue'
    useEventTagListCache.setState({
      tags: new Map([[tagId, { uuid: tagId, name: '업무', color_hex: '#0000ff' }]]),
    })
    const calEvent = makeTodoEvent({ tagId })

    // when
    renderPopover(calEvent)

    // then: 태그 색상 dot이 표시된다
    const dot = screen.getByTestId('tag-color-dot')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveStyle({ backgroundColor: '#0000ff' })
  })

  it('Schedule 이벤트의 이름과 시간을 표시한다', async () => {
    // given: Schedule 이벤트
    const calEvent = makeScheduleEvent({
      name: '팀 미팅',
      eventTime: { time_type: 'period', period_start: 1710480600, period_end: 1710484200 },
    })

    // when
    renderPopover(calEvent)

    // then
    expect(screen.getByText('팀 미팅')).toBeInTheDocument()
    expect(screen.getByTestId('event-detail-popover')).toBeInTheDocument()
  })

  it('데스크톱이면 floating 카드(data-testid="event-detail-popover")로 렌더한다', () => {
    // given: 데스크톱 환경
    vi.mocked(useIsMobile).mockReturnValue(false)
    const calEvent = makeTodoEvent()

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: floating 카드가 렌더되고, BottomSheet 백드롭은 없다
    expect(screen.getByTestId('event-detail-popover')).toBeInTheDocument()
    expect(screen.queryByTestId('bottom-sheet-backdrop')).not.toBeInTheDocument()
  })

  it('모바일이면 BottomSheet 백드롭과 함께 같은 본문이 렌더된다', () => {
    // given: 모바일 환경
    vi.mocked(useIsMobile).mockReturnValue(true)
    const calEvent = makeTodoEvent({ name: '모바일 할 일' })

    // when: 팝오버 렌더
    renderPopover(calEvent)

    // then: BottomSheet 백드롭이 렌더되고, 본문도 함께 보인다. 데스크톱 floating 카드는 같이 뜨지 않는다.
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
    expect(screen.getByText('모바일 할 일')).toBeInTheDocument()
    expect(screen.queryByTestId('event-detail-popover')).not.toBeInTheDocument()
  })

  it('데스크톱에서 anchorRect가 없으면 floating 카드가 viewport 중앙으로 위치한다', () => {
    // given: 데스크톱이고 anchor 미제공
    vi.mocked(useIsMobile).mockReturnValue(false)
    const calEvent = makeTodoEvent()

    // when: anchorRect 없이 렌더
    renderPopover(calEvent, { noAnchor: true })

    // then: 카드가 렌더되며, transform translateY(-50%)가 부착됨 (center fallback의 신호)
    const card = screen.getByTestId('event-detail-popover')
    expect(card).toBeInTheDocument()
    expect(card.getAttribute('style')).toMatch(/translateY\(-50%\)/)
  })
})
