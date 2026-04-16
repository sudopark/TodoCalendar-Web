# EventDetailPopover 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인화면에서 이벤트 클릭 시 페이지 이동 없이 앵커링 팝오버로 상세 정보를 표시하고, 수정/삭제 기능을 제공한다.

**Architecture:** EventPreviewCard를 EventDetailPopover로 대체. 캘린더 그리드와 우측 패널 양쪽에서 동일한 팝오버를 사용. 삭제 로직은 TodoFormPage/ScheduleFormPage에서 추출하여 재사용 가능한 유틸로 분리. 기존 EventPreviewCard, EventDetailPage 및 관련 라우트/테스트를 삭제.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, Vitest, React Testing Library

---

## 파일 구조

| 동작 | 파일 | 역할 |
|------|------|------|
| Create | `src/utils/eventDeleteHelper.ts` | Todo/Schedule 삭제 로직을 재사용 가능한 함수로 추출 |
| Create | `src/components/EventDetailPopover.tsx` | 이벤트 상세 팝오버 컴포넌트 |
| Create | `tests/utils/eventDeleteHelper.test.ts` | 삭제 헬퍼 테스트 |
| Create | `tests/components/EventDetailPopover.test.tsx` | 팝오버 컴포넌트 테스트 |
| Modify | `src/calendar/MainCalendar.tsx` | EventPreviewCard → EventDetailPopover 교체 |
| Modify | `src/components/DayEventList.tsx` | navigate 대신 onEventClick 콜백으로 변경 |
| Modify | `src/components/CurrentTodoList.tsx` | 이벤트 클릭 시 onEventClick 콜백 추가 |
| Modify | `src/components/RightEventPanel.tsx` | 이벤트 클릭 콜백을 상위로 전달 |
| Modify | `src/pages/MainPage.tsx` | 팝오버 상태 관리 + EventDetailPopover 렌더 |
| Modify | `src/pages/TodoFormPage.tsx` | 삭제 로직을 eventDeleteHelper로 위임 |
| Modify | `src/pages/ScheduleFormPage.tsx` | 삭제 로직을 eventDeleteHelper로 위임 |
| Modify | `src/App.tsx` | /events/:id 라우트 제거, lazy import 제거 |
| Delete | `src/components/EventPreviewCard.tsx` | EventDetailPopover로 대체됨 |
| Delete | `src/pages/EventDetailPage.tsx` | 더 이상 사용하지 않음 |
| Delete | `tests/components/EventPreviewCard.test.tsx` | 대체됨 |
| Delete | `tests/pages/EventDetailPage.test.tsx` | 대체됨 |
| Delete | `tests/pages/EventDetailPageEdit.test.tsx` | 대체됨 |

---

### Task 1: 삭제 로직 추출 — eventDeleteHelper

TodoFormPage와 ScheduleFormPage에 중복되어 있는 삭제 로직을 재사용 가능한 유틸로 추출한다.

**Files:**
- Create: `src/utils/eventDeleteHelper.ts`
- Create: `tests/utils/eventDeleteHelper.test.ts`

- [ ] **Step 1: 삭제 헬퍼 테스트 작성**

`tests/utils/eventDeleteHelper.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteTodoEvent, deleteScheduleEvent } from '../../src/utils/eventDeleteHelper'
import { todoApi } from '../../src/api/todoApi'
import { scheduleApi } from '../../src/api/scheduleApi'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: {
    deleteTodo: vi.fn(),
    patchTodo: vi.fn(),
  },
}))
vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: {
    deleteSchedule: vi.fn(),
    excludeRepeating: vi.fn(),
    updateSchedule: vi.fn(),
  },
}))

function resetStores() {
  useCalendarEventsStore.getState().reset()
  useCurrentTodosStore.getState().reset()
}

describe('deleteTodoEvent', () => {
  beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
  })

  it('비반복 todo를 삭제하면 calendarEventsStore와 currentTodosStore에서 제거된다', async () => {
    // given
    const todo: Todo = {
      uuid: 'todo-1', name: 'Test', is_current: false,
      event_time: { time_type: 'at', timestamp: 1000 },
    }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    vi.mocked(todoApi.deleteTodo).mockResolvedValue(undefined as any)

    // when
    await deleteTodoEvent(todo)

    // then — store에서 제거되었는지 확인
    const allEvents = Array.from(useCalendarEventsStore.getState().eventsByDate.values()).flat()
    expect(allEvents.find(e => e.event.uuid === 'todo-1')).toBeUndefined()
  })

  it('반복 todo를 "this" 범위로 삭제하면 다음 턴으로 업데이트된다', async () => {
    // given
    const todo: Todo = {
      uuid: 'todo-2', name: 'Repeat', is_current: false,
      event_time: { time_type: 'at', timestamp: 1000 },
      repeating: { start: 1000, option: { optionType: 'every_day', interval: 1 } },
      repeating_turn: 1,
    }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    const updatedTodo = {
      ...todo,
      event_time: { time_type: 'at' as const, timestamp: 87400 },
      repeating_turn: 2,
    }
    vi.mocked(todoApi.patchTodo).mockResolvedValue(updatedTodo)

    // when
    await deleteTodoEvent(todo, 'this')

    // then — 새 턴의 이벤트가 존재해야 한다
    const allEvents = Array.from(useCalendarEventsStore.getState().eventsByDate.values()).flat()
    const found = allEvents.find(e => e.event.uuid === 'todo-2')
    expect(found).toBeDefined()
  })

  it('반복 todo를 "future" 범위로 삭제하면 시리즈가 종료된다', async () => {
    // given
    const todo: Todo = {
      uuid: 'todo-3', name: 'Repeat', is_current: false,
      event_time: { time_type: 'at', timestamp: 2000 },
      repeating: { start: 1000, option: { optionType: 'every_day', interval: 1 } },
      repeating_turn: 1,
    }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: todo })
    const ended = {
      ...todo,
      repeating: { ...todo.repeating!, end: 1999 },
      event_time: { time_type: 'at' as const, timestamp: 1000 },
    }
    vi.mocked(todoApi.patchTodo).mockResolvedValue(ended)

    // when
    await deleteTodoEvent(todo, 'future')

    // then — 종료된 시리즈 이벤트가 존재해야 한다
    const allEvents = Array.from(useCalendarEventsStore.getState().eventsByDate.values()).flat()
    const found = allEvents.find(e => e.event.uuid === 'todo-3')
    expect(found).toBeDefined()
  })
})

describe('deleteScheduleEvent', () => {
  beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
  })

  it('비반복 schedule을 삭제하면 calendarEventsStore에서 제거된다', async () => {
    // given
    const schedule: Schedule = {
      uuid: 'sch-1', name: 'Meeting',
      event_time: { time_type: 'at', timestamp: 1000 },
    }
    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })
    vi.mocked(scheduleApi.deleteSchedule).mockResolvedValue(undefined as any)

    // when
    await deleteScheduleEvent(schedule)

    // then
    const allEvents = Array.from(useCalendarEventsStore.getState().eventsByDate.values()).flat()
    expect(allEvents.find(e => e.event.uuid === 'sch-1')).toBeUndefined()
  })

  it('반복 schedule을 "this" 범위로 삭제하면 해당 회차가 제외된다', async () => {
    // given
    const schedule: Schedule = {
      uuid: 'sch-2', name: 'Weekly',
      event_time: { time_type: 'at', timestamp: 1000 },
      repeating: { start: 1000, option: { optionType: 'every_week', interval: 1, dayOfWeek: [1], timeZone: 'Asia/Seoul' } },
      show_turns: [3],
    }
    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })
    const excluded = { ...schedule, exclude_repeatings: [3] }
    vi.mocked(scheduleApi.excludeRepeating).mockResolvedValue(excluded)

    // when
    await deleteScheduleEvent(schedule, 'this')

    // then
    const allEvents = Array.from(useCalendarEventsStore.getState().eventsByDate.values()).flat()
    const found = allEvents.find(e => e.event.uuid === 'sch-2')
    expect(found).toBeDefined()
  })

  it('반복 schedule을 "all" 범위로 삭제하면 완전히 제거된다', async () => {
    // given
    const schedule: Schedule = {
      uuid: 'sch-3', name: 'Daily',
      event_time: { time_type: 'at', timestamp: 1000 },
      repeating: { start: 1000, option: { optionType: 'every_day', interval: 1 } },
    }
    useCalendarEventsStore.getState().addEvent({ type: 'schedule', event: schedule })
    vi.mocked(scheduleApi.deleteSchedule).mockResolvedValue(undefined as any)

    // when
    await deleteScheduleEvent(schedule, 'all')

    // then
    const allEvents = Array.from(useCalendarEventsStore.getState().eventsByDate.values()).flat()
    expect(allEvents.find(e => e.event.uuid === 'sch-3')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- tests/utils/eventDeleteHelper.test.ts`
Expected: FAIL — `eventDeleteHelper` 모듈이 존재하지 않음

- [ ] **Step 3: 삭제 헬퍼 구현**

`src/utils/eventDeleteHelper.ts`:
```typescript
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { nextRepeatingTime, getStartTimestamp } from './repeatingTimeCalculator'
import type { Todo } from '../models/Todo'
import type { Schedule } from '../models/Schedule'
import type { RepeatScope } from '../components/RepeatingScopeDialog'

function occurrenceStart(schedule: Schedule): number {
  return schedule.event_time.time_type === 'at'
    ? schedule.event_time.timestamp
    : schedule.event_time.period_start
}

export async function deleteTodoEvent(todo: Todo, scope?: RepeatScope): Promise<void> {
  const { removeEvent, addEvent } = useCalendarEventsStore.getState()
  const { removeTodo } = useCurrentTodosStore.getState()
  const id = todo.uuid

  if (!todo.repeating) {
    await todoApi.deleteTodo(id)
    removeEvent(id)
    removeTodo(id)
    return
  }

  if (scope === 'this') {
    const next = todo.event_time
      ? nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
      : null
    if (next) {
      const updated = await todoApi.patchTodo(id, { event_time: next.time, repeating_turn: next.turn })
      removeEvent(id)
      if (updated.event_time) addEvent({ type: 'todo', event: updated })
    } else {
      await todoApi.deleteTodo(id)
      removeEvent(id)
    }
    removeTodo(id)
  } else {
    // future
    const startTs = todo.event_time ? getStartTimestamp(todo.event_time) : 0
    const cutoff = startTs - 1
    const ended = await todoApi.patchTodo(id, { repeating: { ...todo.repeating, end: cutoff } })
    removeEvent(id)
    if (ended.event_time) addEvent({ type: 'todo', event: ended })
  }
}

export async function deleteScheduleEvent(schedule: Schedule, scope?: RepeatScope): Promise<void> {
  const { removeEvent, addEvent } = useCalendarEventsStore.getState()
  const id = schedule.uuid

  if (!schedule.repeating) {
    await scheduleApi.deleteSchedule(id)
    removeEvent(id)
    return
  }

  if (scope === 'all') {
    await scheduleApi.deleteSchedule(id)
    removeEvent(id)
  } else if (scope === 'this') {
    const turn = schedule.show_turns?.[0] ?? 0
    const excluded = await scheduleApi.excludeRepeating(id, {
      exclude_repeatings: [...(schedule.exclude_repeatings ?? []), turn],
    })
    removeEvent(id)
    addEvent({ type: 'schedule', event: excluded })
  } else {
    // future
    const cutoff = occurrenceStart(schedule) - 1
    const ended = await scheduleApi.updateSchedule(id, {
      repeating: { ...schedule.repeating, end: cutoff },
    })
    removeEvent(id)
    addEvent({ type: 'schedule', event: ended })
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- tests/utils/eventDeleteHelper.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/eventDeleteHelper.ts tests/utils/eventDeleteHelper.test.ts
git commit -m "#57 feat(utils): 이벤트 삭제 로직을 eventDeleteHelper로 추출"
```

---

### Task 2: EventDetailPopover 컴포넌트 구현

이벤트 상세 정보를 팝오버로 표시하는 컴포넌트를 TDD로 구현한다.

**Files:**
- Create: `src/components/EventDetailPopover.tsx`
- Create: `tests/components/EventDetailPopover.test.tsx`

**참고 — 알림 표시 헬퍼:**

NotificationOption을 사람이 읽을 수 있는 텍스트로 변환하는 로직이 필요하다. NotificationPickerDropdown의 프리셋 매핑(`TIME_PRESETS`, `ALLDAY_PRESETS`)을 참고하여 팝오버 내부에 `formatNotification` 헬퍼 함수를 구현한다.

- [ ] **Step 1: 팝오버 테스트 작성**

`tests/components/EventDetailPopover.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EventDetailPopover from '../../src/components/EventDetailPopover'
import { eventDetailApi } from '../../src/api/eventDetailApi'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import type { CalendarEvent } from '../../src/utils/eventTimeUtils'
import type { Todo } from '../../src/models/Todo'
import type { Schedule } from '../../src/models/Schedule'

vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: {
    getEventDetail: vi.fn(),
  },
}))

// 기본 anchorRect
const mockAnchorRect = {
  top: 100, bottom: 140, left: 200, right: 300,
  width: 100, height: 40, x: 200, y: 100,
  toJSON: () => {},
} as DOMRect

function renderPopover(calEvent: CalendarEvent, props?: Partial<React.ComponentProps<typeof EventDetailPopover>>) {
  const defaultProps = {
    calEvent,
    anchorRect: mockAnchorRect,
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }
  return render(
    <MemoryRouter>
      <EventDetailPopover {...defaultProps} {...props} />
    </MemoryRouter>,
  )
}

describe('EventDetailPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({})
  })

  it('이벤트 이름과 시간을 표시한다', async () => {
    // given
    const todo: Todo = {
      uuid: 't1', name: '테스트 할일', is_current: false,
      event_time: { time_type: 'at', timestamp: 1713340800 },
    }

    // when
    renderPopover({ type: 'todo', event: todo })

    // then
    expect(screen.getByText('테스트 할일')).toBeInTheDocument()
  })

  it('반복 정보를 표시한다', async () => {
    // given
    const todo: Todo = {
      uuid: 't2', name: 'Repeat', is_current: false,
      event_time: { time_type: 'at', timestamp: 1000 },
      repeating: { start: 1000, option: { optionType: 'every_day', interval: 1 } },
    }

    // when
    renderPopover({ type: 'todo', event: todo })

    // then — 반복 정보 섹션이 존재해야 한다
    expect(screen.getByTestId('repeating-info')).toBeInTheDocument()
  })

  it('알림 설정을 표시한다', async () => {
    // given
    const todo: Todo = {
      uuid: 't3', name: 'Notif', is_current: false,
      event_time: { time_type: 'at', timestamp: 1000 },
      notification_options: [{ type: 'time', seconds: 0 }],
    }

    // when
    renderPopover({ type: 'todo', event: todo })

    // then
    expect(screen.getByTestId('notification-info')).toBeInTheDocument()
  })

  it('eventDetail API로 추가 정보(장소, URL, 메모)를 로드하여 표시한다', async () => {
    // given
    const schedule: Schedule = {
      uuid: 's1', name: 'Meeting',
      event_time: { time_type: 'at', timestamp: 1000 },
    }
    vi.mocked(eventDetailApi.getEventDetail).mockResolvedValue({
      place: '서울 강남', url: 'https://example.com', memo: '메모 내용',
    })

    // when
    renderPopover({ type: 'schedule', event: schedule })

    // then
    await waitFor(() => {
      expect(screen.getByText('서울 강남')).toBeInTheDocument()
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
      expect(screen.getByText('메모 내용')).toBeInTheDocument()
    })
  })

  it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
    // given
    const todo: Todo = { uuid: 't4', name: 'Close', is_current: false }
    const onClose = vi.fn()

    // when
    renderPopover({ type: 'todo', event: todo }, { onClose })
    await userEvent.click(screen.getByTestId('popover-close-btn'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('수정 버튼 클릭 시 onEdit가 호출된다', async () => {
    // given
    const todo: Todo = { uuid: 't5', name: 'Edit', is_current: false }
    const onEdit = vi.fn()

    // when
    renderPopover({ type: 'todo', event: todo }, { onEdit })
    await userEvent.click(screen.getByTestId('popover-edit-btn'))

    // then
    expect(onEdit).toHaveBeenCalled()
  })

  it('삭제 버튼 클릭 시 onDelete가 호출된다', async () => {
    // given
    const todo: Todo = { uuid: 't6', name: 'Del', is_current: false }
    const onDelete = vi.fn()

    // when
    renderPopover({ type: 'todo', event: todo }, { onDelete })
    await userEvent.click(screen.getByTestId('popover-delete-btn'))

    // then
    expect(onDelete).toHaveBeenCalled()
  })

  it('backdrop 클릭 시 onClose가 호출된다', async () => {
    // given
    const todo: Todo = { uuid: 't7', name: 'Backdrop', is_current: false }
    const onClose = vi.fn()

    // when
    renderPopover({ type: 'todo', event: todo }, { onClose })
    await userEvent.click(screen.getByTestId('popover-backdrop'))

    // then
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- tests/components/EventDetailPopover.test.tsx`
Expected: FAIL — 모듈이 존재하지 않음

- [ ] **Step 3: EventDetailPopover 구현**

`src/components/EventDetailPopover.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useEventTagStore } from '../stores/eventTagStore'
import { eventDetailApi } from '../api/eventDetailApi'
import { EventTimeDisplay } from './EventTimeDisplay'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import type { EventDetail } from '../models/EventDetail'
import type { Repeating } from '../models/Repeating'
import type { NotificationOption } from '../models'

interface EventDetailPopoverProps {
  calEvent: CalendarEvent
  anchorRect: DOMRect
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function repeatingLabel(repeating: Repeating, t: TFunction): string {
  const { option } = repeating
  switch (option.optionType) {
    case 'every_day': return t('repeat.every_day', { n: option.interval })
    case 'every_week': return t('repeat.every_week', { n: option.interval })
    case 'every_month': return t('repeat.every_month', { n: option.interval })
    case 'every_year': return t('repeat.every_year', { n: option.interval })
    case 'every_year_some_day': return t('repeat.every_year_some_day')
    case 'lunar_calendar_every_year': return `${t('repeat.every_year', { n: 1 })} (${t('repeat.lunar')})`
  }
}

function formatNotification(option: NotificationOption, t: TFunction): string {
  if (option.type === 'time') {
    const s = option.seconds
    if (s === 0) return t('notif.on_time')
    if (s === -60) return t('notif.1min_before')
    if (s === -300) return t('notif.5min_before')
    if (s === -600) return t('notif.10min_before')
    if (s === -900) return t('notif.15min_before')
    if (s === -1800) return t('notif.30min_before')
    if (s === -3600) return t('notif.1hour_before')
    if (s === -7200) return t('notif.2hour_before')
    if (s === -86400) return t('notif.1day_before')
    if (s === -172800) return t('notif.2day_before')
    if (s === -604800) return t('notif.1week_before')
    return `${Math.abs(s)}초 전`
  }
  // allday type
  if (option.dayOffset === 0 && option.hour === 9 && option.minute === 0) return t('notif.allday_same_day_9am')
  if (option.dayOffset === 0 && option.hour === 12 && option.minute === 0) return t('notif.allday_same_day_noon')
  if (option.dayOffset === -1 && option.hour === 9 && option.minute === 0) return t('notif.allday_1day_before_9am')
  if (option.dayOffset === -2 && option.hour === 9 && option.minute === 0) return t('notif.allday_2day_before_9am')
  if (option.dayOffset === -7 && option.hour === 9 && option.minute === 0) return t('notif.allday_1week_before_9am')
  return `${Math.abs(option.dayOffset)}일 전 ${option.hour}:${String(option.minute).padStart(2, '0')}`
}

export default function EventDetailPopover({ calEvent, anchorRect, onClose, onEdit, onDelete }: EventDetailPopoverProps) {
  const { t } = useTranslation()
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const [detail, setDetail] = useState<EventDetail | null>(null)

  const event = calEvent.event
  const tagColor = event.event_tag_id ? getColorForTagId(event.event_tag_id) : null
  const eventTime = event.event_time
  const repeating = event.repeating
  const notifications = event.notification_options

  // 위치 계산: 기존 EventPreviewCard 패턴 재활용
  const showBelow = window.innerHeight - anchorRect.bottom > 300
  const top = showBelow ? anchorRect.bottom + 4 : anchorRect.top - 4
  const translateY = showBelow ? '0' : '-100%'
  const left = Math.min(anchorRect.left, window.innerWidth - 340)

  useEffect(() => {
    eventDetailApi.getEventDetail(event.uuid)
      .then(d => setDetail(d))
      .catch(() => { /* detail is optional */ })
  }, [event.uuid])

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        data-testid="popover-backdrop"
        onClick={onClose}
      />
      {/* Popover card */}
      <div
        className="fixed z-40 w-[320px] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        style={{ top, left, transform: `translateY(${translateY})` }}
        data-testid="event-detail-popover"
      >
        {/* Header: buttons */}
        <div className="flex items-center justify-end gap-1 px-3 pt-3">
          <button
            data-testid="popover-edit-btn"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            onClick={onEdit}
            aria-label={t('common.edit')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            data-testid="popover-delete-btn"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            onClick={onDelete}
            aria-label={t('common.delete')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            data-testid="popover-close-btn"
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 pt-2 space-y-3">
          {/* Name + tag color */}
          <div className="flex items-start gap-2">
            {tagColor && (
              <span
                className="mt-1.5 inline-block h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: tagColor }}
              />
            )}
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 break-words">
              {event.name}
            </h2>
          </div>

          {/* Event time */}
          {eventTime && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <EventTimeDisplay eventTime={eventTime} />
            </p>
          )}

          {/* Repeating */}
          {repeating && (
            <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="repeating-info">
              {repeatingLabel(repeating, t)}
            </p>
          )}

          {/* Notifications */}
          {notifications && notifications.length > 0 && (
            <div data-testid="notification-info" className="text-sm text-gray-500 dark:text-gray-400">
              {notifications.map((n, i) => (
                <p key={i}>{formatNotification(n, t)}</p>
              ))}
            </div>
          )}

          {/* EventDetail: place, url, memo */}
          {detail && (detail.place || detail.url || detail.memo) && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-2">
              {detail.place && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{detail.place}</p>
              )}
              {detail.url && (
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-500 underline break-all"
                >
                  {detail.url}
                </a>
              )}
              {detail.memo && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{detail.memo}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- tests/components/EventDetailPopover.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/EventDetailPopover.tsx tests/components/EventDetailPopover.test.tsx
git commit -m "#57 feat(components): EventDetailPopover 컴포넌트 구현"
```

---

### Task 3: MainPage에 팝오버 통합 — 캘린더 그리드 연결

MainCalendar에서 EventPreviewCard를 제거하고, MainPage 레벨에서 EventDetailPopover를 관리한다.

**Files:**
- Modify: `src/calendar/MainCalendar.tsx`
- Modify: `src/pages/MainPage.tsx`

- [ ] **Step 1: MainCalendar에서 EventPreviewCard 제거하고 onEventClick 콜백으로 변경**

`src/calendar/MainCalendar.tsx` — EventPreviewCard 관련 코드를 제거하고, 이벤트 클릭을 상위로 전달:

```typescript
// 제거할 import:
// import EventPreviewCard from '../components/EventPreviewCard'

// 제거할 interface & state:
// interface PreviewState { ... }
// const [previewEvent, setPreviewEvent] = useState<PreviewState | null>(null)

// Props에 onEventClick 추가:
interface MainCalendarProps {
  today?: Date
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

// handleEventClick을 props로 위임:
// function handleEventClick(calEvent: CalendarEvent, anchorRect: DOMRect) {
//   props.onEventClick?.(calEvent, anchorRect)
// }

// JSX에서 EventPreviewCard 렌더 제거
```

변경 후 전체 파일:
```typescript
import { useMemo, useEffect } from 'react'
import { buildCalendarGrid } from './calendarUtils'
import MainCalendarGrid from './MainCalendarGrid'
import { useUiStore } from '../stores/uiStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface MainCalendarProps {
  today?: Date
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export default function MainCalendar({ today: todayProp, onEventClick }: MainCalendarProps) {
  const todayKey = todayProp
    ? `${todayProp.getFullYear()}-${todayProp.getMonth()}-${todayProp.getDate()}`
    : ''
  const today = useMemo(() => {
    if (!todayProp) return new Date()
    return new Date(todayProp.getFullYear(), todayProp.getMonth(), todayProp.getDate())
  }, [todayKey])

  const currentMonth = useUiStore(s => s.currentMonth)
  const fetchEventsForYear = useCalendarEventsStore(s => s.fetchEventsForYear)
  const fetchHolidays = useHolidayStore(s => s.fetchHolidays)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const days = useMemo(() => buildCalendarGrid(year, month, today), [year, month, today])

  useEffect(() => {
    if (days.length === 0) return
    const years = new Set(days.map(d => d.date.getFullYear()))
    years.forEach(y => fetchEventsForYear(y))
    years.forEach(y => fetchHolidays(y))
  }, [days, fetchEventsForYear, fetchHolidays])

  return (
    <div className="flex-1 flex flex-col overflow-hidden border border-border-calendar rounded-lg shadow-sm bg-white m-4">
      <MainCalendarGrid days={days} onEventClick={onEventClick} />
    </div>
  )
}
```

- [ ] **Step 2: MainPage에 팝오버 상태 관리 추가 (캘린더 연결만)**

`src/pages/MainPage.tsx`:
```typescript
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopToolbar from '../components/TopToolbar'
import LeftSidebar from '../components/LeftSidebar'
import MainCalendar from '../calendar/MainCalendar'
import { RightEventPanel } from '../components/RightEventPanel'
import { EventFormPopover } from '../components/eventForm/EventFormPopover'
import EventDetailPopover from '../components/EventDetailPopover'
import { RepeatingScopeDialog } from '../components/RepeatingScopeDialog'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useUiStore } from '../stores/uiStore'
import { useToastStore } from '../stores/toastStore'
import { deleteTodoEvent, deleteScheduleEvent } from '../utils/eventDeleteHelper'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import type { RepeatScope } from '../components/RepeatingScopeDialog'

interface PopoverState {
  calEvent: CalendarEvent
  anchorRect: DOMRect
}

export function MainPage() {
  const { t } = useTranslation()
  useKeyboardShortcuts()
  const navigate = useNavigate()
  const location = useLocation()
  const rightPanelOpen = useUiStore(s => s.rightPanelOpen)

  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [showDeleteScope, setShowDeleteScope] = useState(false)

  function handleEventClick(calEvent: CalendarEvent, anchorRect: DOMRect) {
    setPopover({ calEvent, anchorRect })
  }

  function handleClosePopover() {
    setPopover(null)
  }

  function handleEdit() {
    if (!popover) return
    const { calEvent } = popover
    const path = calEvent.type === 'todo'
      ? `/todos/${calEvent.event.uuid}/edit`
      : `/schedules/${calEvent.event.uuid}/edit`
    navigate(path, { state: { background: location } })
    setPopover(null)
  }

  function handleDeleteClick() {
    if (!popover) return
    if (popover.calEvent.event.repeating) {
      setShowDeleteScope(true)
    } else {
      applyDelete()
    }
  }

  async function applyDelete(scope?: RepeatScope) {
    if (!popover) return
    setShowDeleteScope(false)
    try {
      if (popover.calEvent.type === 'todo') {
        await deleteTodoEvent(popover.calEvent.event, scope)
      } else {
        await deleteScheduleEvent(popover.calEvent.event, scope)
      }
      setPopover(null)
    } catch {
      useToastStore.getState().show(t('event.delete_failed', '삭제 실패'), 'error')
    }
  }

  return (
    <div className="h-screen bg-slate-50">
      <div className="flex h-full flex-col overflow-hidden">
        <TopToolbar />
        <div className="flex flex-1 min-h-0 relative">
          <LeftSidebar />
          <MainCalendar onEventClick={handleEventClick} />

          {/* 오버레이: 중앙 캘린더를 덮는 패널 */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-[408px] z-10 transition-transform duration-300 ease-in-out ${
              rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <RightEventPanel />
          </div>
        </div>
      </div>
      <EventFormPopover />

      {popover && (
        <EventDetailPopover
          calEvent={popover.calEvent}
          anchorRect={popover.anchorRect}
          onClose={handleClosePopover}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      {showDeleteScope && popover && (
        <RepeatingScopeDialog
          mode="delete"
          eventType={popover.calEvent.type}
          onSelect={(scope) => applyDelete(scope)}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add src/calendar/MainCalendar.tsx src/pages/MainPage.tsx
git commit -m "#57 feat(main): 캘린더 이벤트 클릭 시 EventDetailPopover 연결"
```

---

### Task 4: 우측 패널 이벤트 클릭을 팝오버로 연결

DayEventList와 CurrentTodoList에서 이벤트 클릭 시 navigate 대신 onEventClick 콜백을 사용하도록 변경한다.

**Files:**
- Modify: `src/components/DayEventList.tsx`
- Modify: `src/components/CurrentTodoList.tsx`
- Modify: `src/components/RightEventPanel.tsx`
- Modify: `src/pages/MainPage.tsx`

- [ ] **Step 1: DayEventList에서 navigate를 onEventClick 콜백으로 변경**

`src/components/DayEventList.tsx` — navigate 관련 import 제거, props에 콜백 추가:

변경 전:
```typescript
import { useNavigate, useLocation } from 'react-router-dom'
```
변경 후: 해당 import 제거

EventItem 변경 — `onNavigate` prop 대신 ref 기반 anchorRect 전달:
```typescript
function EventItem({ calEvent, onEventClick }: { calEvent: CalendarEvent; onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void }) {
  // ... 기존 코드 유지 ...
  return (
    <div
      className="flex items-stretch gap-2 rounded-[5px] bg-[#f3f4f7] px-3 py-2.5 hover:brightness-95 cursor-pointer"
      onClick={(e) => onEventClick(calEvent, e.currentTarget.getBoundingClientRect())}
    >
      {/* 기존 내용 동일 */}
    </div>
  )
}
```

DayEventList props 변경:
```typescript
interface DayEventListProps {
  selectedDate: Date | null
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function DayEventList({ selectedDate, onEventClick }: DayEventListProps) {
  // navigate, location import/사용 제거
  const eventsByDate = useCalendarEventsStore(s => s.eventsByDate)
  const isTagHidden = useTagFilterStore(s => s.isTagHidden)

  // ... 기존 정렬 로직 유지 ...

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-[#969696]">
          {t('event.no_events')}
        </div>
      ) : (
        sorted.map((calEvent, i) => (
          <EventItem
            key={`${calEvent.event.uuid}-${i}`}
            calEvent={calEvent}
            onEventClick={onEventClick}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: CurrentTodoList에 onEventClick 콜백 추가**

`src/components/CurrentTodoList.tsx` — 현재 Todo 아이템 클릭 시에도 팝오버를 띄울 수 있도록 onEventClick props 추가. 기존 코드를 읽고 이벤트 아이템 클릭 부분에 콜백을 연결한다.

```typescript
interface CurrentTodoListProps {
  showHeader?: boolean
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}
```

Todo 아이템의 이름 클릭 시:
```typescript
onClick={(e) => onEventClick?.({ type: 'todo', event: todo }, e.currentTarget.getBoundingClientRect())}
```

- [ ] **Step 3: RightEventPanel에서 onEventClick 콜백 전달**

`src/components/RightEventPanel.tsx`:
```typescript
interface RightEventPanelProps {
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function RightEventPanel({ onEventClick }: RightEventPanelProps) {
  // ... 기존 코드 유지 ...

  // DayEventList에 전달:
  <DayEventList selectedDate={selectedDate} onEventClick={onEventClick} />

  // CurrentTodoList에 전달:
  <CurrentTodoList showHeader={false} onEventClick={onEventClick} />
}
```

- [ ] **Step 4: MainPage에서 RightEventPanel에 콜백 전달**

`src/pages/MainPage.tsx`:
```typescript
<RightEventPanel onEventClick={handleEventClick} />
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/components/DayEventList.tsx src/components/CurrentTodoList.tsx src/components/RightEventPanel.tsx src/pages/MainPage.tsx
git commit -m "#57 feat(panel): 우측 패널 이벤트 클릭을 EventDetailPopover로 연결"
```

---

### Task 5: 기존 코드 폐기 및 정리

EventPreviewCard, EventDetailPage, 관련 테스트, 라우트를 삭제한다.

**Files:**
- Delete: `src/components/EventPreviewCard.tsx`
- Delete: `src/pages/EventDetailPage.tsx`
- Delete: `tests/components/EventPreviewCard.test.tsx`
- Delete: `tests/pages/EventDetailPage.test.tsx`
- Delete: `tests/pages/EventDetailPageEdit.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/TodoFormPage.tsx`
- Modify: `src/pages/ScheduleFormPage.tsx`

- [ ] **Step 1: EventPreviewCard, EventDetailPage 및 관련 테스트 파일 삭제**

```bash
rm src/components/EventPreviewCard.tsx
rm src/pages/EventDetailPage.tsx
rm tests/components/EventPreviewCard.test.tsx
rm tests/pages/EventDetailPage.test.tsx
rm tests/pages/EventDetailPageEdit.test.tsx
```

- [ ] **Step 2: App.tsx에서 /events/:id 라우트 및 EventDetailPage lazy import 제거**

`src/App.tsx` 변경:

제거:
```typescript
const EventDetailPage = React.lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })))
```

Routes에서 제거 (두 곳 — 메인 라우트와 오버레이):
```typescript
<Route path="/events/:id" element={<EventDetailPage />} />
```

오버레이 배열에서도 제거:
```typescript
['/events/:id', <EventDetailPage />],
```

- [ ] **Step 3: TodoFormPage, ScheduleFormPage에서 삭제 로직을 eventDeleteHelper로 교체**

`src/pages/TodoFormPage.tsx` — `applyDelete` 함수 본문을 `deleteTodoEvent` 호출로 교체:

```typescript
import { deleteTodoEvent } from '../utils/eventDeleteHelper'

async function applyDelete(scope: RepeatScope) {
  if (!id || !original) return
  try {
    await deleteTodoEvent(original, scope)
    navigate(-1)
  } catch (e) {
    console.warn('삭제 실패:', e)
    setError(t('todoForm.delete_failed'))
    setShowDeleteScope(false)
    setShowConfirm(false)
  }
}
```

`src/pages/ScheduleFormPage.tsx` — 동일 패턴:
```typescript
import { deleteScheduleEvent } from '../utils/eventDeleteHelper'

async function applyDelete(scope: RepeatScope) {
  if (!id || !original) return
  try {
    await deleteScheduleEvent(original, scope)
    navigate(-1)
  } catch (e) {
    console.warn('삭제 실패:', e)
    setError(t('scheduleForm.delete_failed'))
    setShowDeleteScope(false)
    setShowDeleteConfirm(false)
  }
}
```

이로 인해 TodoFormPage/ScheduleFormPage에서 직접 사용하던 `removeEvent`, `addEvent`, `removeTodo`, `nextRepeatingTime`, `getStartTimestamp` 등의 import를 삭제 로직에서만 쓰던 것이면 정리한다. 단, 저장(applyUpdate/applyCreate) 로직에서도 사용하므로 실제로 삭제 로직에서만 쓰이는 import만 정리.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "#57 refactor: EventPreviewCard, EventDetailPage 폐기 및 삭제 로직 통합"
```

---

### Task 6: 최종 검증

- [ ] **Step 1: 전체 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 2: 전체 테스트 실행**

Run: `npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 3: dev 서버로 수동 확인**

Run: `npm run dev`

확인 항목:
1. 캘린더 이벤트 바 클릭 → 팝오버 노출 (이름, 시간, 반복, 알림, 추가정보)
2. 우측 패널 이벤트 클릭 → 동일 팝오버 노출
3. 수정 버튼 → TodoFormPage/ScheduleFormPage 오버레이 진입
4. 삭제 버튼 (비반복) → 즉시 삭제
5. 삭제 버튼 (반복) → RepeatingScopeDialog → 범위 선택 → 삭제
6. 닫기 버튼 / backdrop 클릭 → 팝오버 닫힘
7. `/events/:id` URL 직접 접근 → NotFoundPage 표시 (라우트 제거됨)
