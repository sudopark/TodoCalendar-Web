import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ScheduleFormPage } from '../../src/pages/ScheduleFormPage'
import { ToastContainer } from '../../src/components/Toast'

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    excludeRepeating: vi.fn(),
    deleteSchedule: vi.fn(),
  },
}))
vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: {
    getEventDetail: vi.fn(),
    updateEventDetail: vi.fn(),
    deleteEventDetail: vi.fn(),
  },
}))
vi.mock('../../src/stores/eventTagStore', () => ({ useEventTagStore: vi.fn() }))
vi.mock('../../src/stores/uiStore', () => ({ useUiStore: vi.fn() }))
vi.mock('../../src/stores/calendarEventsStore', () => ({ useCalendarEventsStore: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useEventTagStore } from '../../src/stores/eventTagStore'
import { useUiStore } from '../../src/stores/uiStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'

const mockAddEvent = vi.fn()
const mockRemoveEvent = vi.fn()
async function setupMocks() {
  const { eventDetailApi } = await import('../../src/api/eventDetailApi')
  vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({})
  vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})
  vi.mocked(useEventTagStore).mockImplementation((sel: any) => sel({ tags: new Map(), getColorForTagId: () => null }))
  vi.mocked(useUiStore).mockImplementation((sel: any) => sel({ selectedDate: new Date('2025-03-31') }))
  const calendarState = {
    addEvent: mockAddEvent,
    removeEvent: mockRemoveEvent,
  }
  vi.mocked(useCalendarEventsStore).mockImplementation((sel?: any) =>
    sel ? sel(calendarState) : calendarState
  )
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/schedules/new']}>
      <Routes><Route path="/schedules/new" element={<ScheduleFormPage />} /></Routes>
      <ToastContainer />
    </MemoryRouter>
  )
}

function renderEdit(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/schedules/${id}/edit`]}>
      <Routes><Route path="/schedules/:id/edit" element={<ScheduleFormPage />} /></Routes>
      <ToastContainer />
    </MemoryRouter>
  )
}

describe('ScheduleFormPage — create', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('"새 Schedule" 제목을 표시한다', () => {
    renderCreate()
    expect(screen.getByText('새 Schedule')).toBeInTheDocument()
  })

  it('이름 입력 후 저장하면 createSchedule이 호출되고 화면을 닫는다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.createSchedule).mockResolvedValue({
      uuid: 'new-1', name: '회의', event_time: { time_type: 'at', timestamp: 1743375600 },
    })
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '회의')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('이름이 비어 있으면 저장 버튼을 클릭해도 API가 호출되지 않는다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    renderCreate()
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(scheduleApi.createSchedule).not.toHaveBeenCalled()
  })
})

describe('ScheduleFormPage — edit (반복)', () => {
  const repeatingSch = {
    uuid: 'sch-1',
    name: '주간 미팅',
    event_time: { time_type: 'at' as const, timestamp: 1743375600 },
    repeating: { start: 1743375600, option: { optionType: 'every_week' as const, interval: 1, dayOfWeek: [1], timeZone: 'Asia/Seoul' } },
    show_turns: [3],
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('기존 schedule을 불러와 이름 필드에 표시한다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(repeatingSch as any)
    renderEdit('sch-1')
    await waitFor(() => expect(screen.getByDisplayValue('주간 미팅')).toBeInTheDocument())
  })

  it('반복 Schedule 수정 시 scope 선택 다이얼로그가 표시된다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(repeatingSch as any)
    renderEdit('sch-1')
    await waitFor(() => screen.getByDisplayValue('주간 미팅'))
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByText('반복 일정 수정')).toBeInTheDocument()
  })

  it('반복 Schedule 삭제 시 scope 선택 다이얼로그가 표시된다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(repeatingSch as any)
    renderEdit('sch-1')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText('반복 일정 삭제')).toBeInTheDocument()
  })

  it('비반복 Schedule 삭제 시 확인 다이얼로그가 표시된다', async () => {
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const simpleSch = { uuid: 'sch-2', name: '단순 일정', event_time: { time_type: 'at' as const, timestamp: 1743375600 } }
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(simpleSch as any)
    renderEdit('sch-2')
    await waitFor(() => screen.getByRole('button', { name: '삭제' }))
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByText(/삭제할까요/)).toBeInTheDocument()
  })
})

describe('ScheduleFormPage — EventDetail (place/url/memo)', () => {
  const baseSchedule = {
    uuid: 'sch-1',
    name: '팀 미팅',
    event_time: { time_type: 'at' as const, timestamp: 1743375600 },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('편집 모드 진입 시 EventDetail이 입력 필드에 채워진다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: '강남역', url: 'https://example.com', memo: '사전 준비 필요',
    })

    // when
    renderEdit('sch-1')

    // then
    await waitFor(() => {
      expect(screen.getByLabelText('장소')).toHaveValue('강남역')
      expect(screen.getByLabelText('URL')).toHaveValue('https://example.com')
      expect(screen.getByLabelText('메모')).toHaveValue('사전 준비 필요')
    })
  })

  it('EventDetail API가 실패해도 폼은 정상 렌더되고 기본 정보가 표시된다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockRejectedValue(new Error('network error'))

    // when
    renderEdit('sch-1')

    // then: 폼이 정상 렌더되고 이름 필드에 기존 값이 표시됨
    await waitFor(() => {
      expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument()
    })
    // detail 필드는 빈 값으로 폴백
    expect(screen.getByLabelText('장소')).toHaveValue('')
    expect(screen.getByLabelText('URL')).toHaveValue('')
    expect(screen.getByLabelText('메모')).toHaveValue('')
  })

  it('신규 생성 시 place/url/memo 입력 후 저장하면 화면을 닫는다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.createSchedule).mockResolvedValue({
      uuid: 'new-1', name: '신규 일정', event_time: { time_type: 'at', timestamp: 1743375600 },
    } as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

    // when
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '신규 일정')
    await userEvent.type(screen.getByLabelText('장소'), '역삼역')
    await userEvent.type(screen.getByLabelText('URL'), 'https://meet.google.com')
    await userEvent.type(screen.getByLabelText('메모'), '회의 링크 참고')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: 저장 후 화면을 닫음
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('수정 시 place/url/memo 입력 후 저장하면 화면을 닫는다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    vi.mocked(scheduleApi.updateSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

    // when
    renderEdit('sch-1')
    await waitFor(() => screen.getByDisplayValue('팀 미팅'))
    await userEvent.clear(screen.getByLabelText('장소'))
    await userEvent.type(screen.getByLabelText('장소'), '코엑스')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
  })

  it('detail 저장이 실패해도 기본 저장은 성공하고 에러 toast가 표시된다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.createSchedule).mockResolvedValue({
      uuid: 'new-2', name: '테스트', event_time: { time_type: 'at', timestamp: 1743375600 },
    } as any)
    vi.mocked(eventDetailApi.updateEventDetail).mockRejectedValue(new Error('server error'))

    // when
    renderCreate()
    await userEvent.type(screen.getByLabelText('이름'), '테스트')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: 기본 저장은 성공 → 화면을 닫고, detail 실패 toast가 표시됨
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('추가 정보 저장 실패')).toBeInTheDocument())
  })

  it('편집 모드 진입 후 변경 없이 저장 버튼은 비활성이다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })

    // when
    renderEdit('sch-1')
    await waitFor(() => expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument())

    // then: 변경 없으면 저장 버튼 비활성
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('편집 모드에서 이름을 변경하면 저장 버튼이 활성화된다', async () => {
    // given
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('sch-1')
    await waitFor(() => screen.getByDisplayValue('팀 미팅'))

    // when
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')

    // then: 변경 후 저장 버튼 활성
    expect(screen.getByRole('button', { name: '저장' })).not.toBeDisabled()
  })

  it('저장 중에는 저장 버튼이 비활성이다', async () => {
    // given: updateSchedule이 pending 상태
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    let resolveUpdate!: (v: any) => void
    vi.mocked(scheduleApi.updateSchedule).mockImplementation(
      () => new Promise(r => { resolveUpdate = r })
    )
    vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})
    renderEdit('sch-1')
    await waitFor(() => screen.getByDisplayValue('팀 미팅'))
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')

    // when: 저장 클릭 (updateSchedule은 pending 상태)
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then: 저장 중에는 버튼 비활성
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()

    // cleanup
    resolveUpdate({ ...baseSchedule, name: '팀 미팅 수정' })
  })

  it('변경 없이 취소 버튼을 누르면 바로 이전 화면으로 돌아간다', async () => {
    // given: 기존 schedule 로드 완료
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('sch-1')
    await waitFor(() => expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument())

    // when: 변경 없이 취소 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then: 바로 이전 화면으로 이동
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('변경 후 취소 버튼을 누르면 확인 다이얼로그가 표시된다', async () => {
    // given: 기존 schedule 로드 완료
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('sch-1')
    await waitFor(() => expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument())

    // when: 이름 변경 후 취소 버튼 클릭
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then: 확인 다이얼로그 표시
    expect(screen.getByText('변경사항이 저장되지 않았어요')).toBeInTheDocument()
    expect(screen.getByText('지금 닫으면 변경사항이 사라져요. 계속하시겠어요?')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('확인 다이얼로그에서 "떠나기"를 누르면 이전 화면으로 돌아간다', async () => {
    // given: 변경 후 취소 → 다이얼로그 표시
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '', url: '', memo: '' })
    renderEdit('sch-1')
    await waitFor(() => expect(screen.getByDisplayValue('팀 미팅')).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText('이름'), ' 수정')
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // when: "떠나기" 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '떠나기' }))

    // then: 이전 화면으로 이동
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('더보기 > 복제 클릭 시 신규 Form으로 이동한다', async () => {
    // given: 편집 모드 로드
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockResolvedValue(baseSchedule as any)
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({ place: '강남역', url: '', memo: '' })
    renderEdit('sch-1')
    await waitFor(() => screen.getByDisplayValue('팀 미팅'))

    // when
    await userEvent.click(screen.getByRole('button', { name: '더보기' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '복제' }))

    // then: navigate가 호출됨 (인자 세부 검증은 금지 패턴)
    expect(mockNavigate).toHaveBeenCalled()
  })
})

describe('ScheduleFormPage — prefilled 신규 모드', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  function renderCreateWithPrefilled(prefilled: Record<string, unknown>) {
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/schedules/new', state: { prefilled } }]}>
        <Routes><Route path="/schedules/new" element={<ScheduleFormPage />} /></Routes>
        <ToastContainer />
      </MemoryRouter>
    )
  }

  it('신규 모드에서 prefilled state가 있으면 해당 값으로 초기화된다', () => {
    // given
    const prefilled = {
      name: '복제된 회의',
      place: '강남역',
      url: '',
      memo: '메모',
      tagId: null,
      eventTime: { time_type: 'at', timestamp: 1000 },
      repeating: null,
      notifications: [],
    }

    // when
    renderCreateWithPrefilled(prefilled)

    // then
    expect(screen.getByDisplayValue('복제된 회의')).toBeInTheDocument()
    expect(screen.getByLabelText('장소')).toHaveValue('강남역')
    expect(screen.getByLabelText('메모')).toHaveValue('메모')
  })
})

describe('ScheduleFormPage — entry UX', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await setupMocks()
  })

  it('id가 있고 API 응답이 오기 전에도 저장 버튼을 포함한 Form 레이아웃이 즉시 렌더된다', async () => {
    // given: getSchedule과 getEventDetail이 영원히 pending (진입 직후 상태)
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    const { eventDetailApi } = await import('../../src/api/eventDetailApi')
    vi.mocked(scheduleApi.getSchedule).mockReturnValue(new Promise(() => {}))
    vi.mocked(eventDetailApi.getEventDetail).mockReturnValue(new Promise(() => {}))

    // when
    renderEdit('abc')

    // then: 중앙 스피너만 보이는 게 아니라 Form 상단의 저장 버튼이 즉시 존재
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
  })
})
