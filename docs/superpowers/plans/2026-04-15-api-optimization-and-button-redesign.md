# API 호출 고도화 (#54) + 새 이벤트 버튼 디자인 (#52) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이벤트 조회를 년도 단위 캐시로 전환하고, 반복 이벤트 수정/삭제 시 전체 재조회를 제거하고, holiday API 400 에러를 수정하고, 새로고침 버튼을 추가하고, 우측 패널 버튼 디자인을 수정한다.

**Architecture:** calendarEventsStore를 년도 단위 캐시 기반으로 전환. 모든 이벤트 변경(반복 포함)은 API 응답값으로 메모리 업데이트. holidayStore에 code 필드 추가하여 올바른 파라미터 전달. TopToolbar에 새로고침 버튼 추가. CreateEventButton을 좌측 사이드바 스타일로 통일.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Tailwind CSS

---

## 파일 충돌 맵

| 파일 | Task |
|------|------|
| `src/stores/calendarEventsStore.ts` | 1 |
| `tests/stores/calendarEventsStore.test.ts` | 1 |
| `src/utils/eventTimeUtils.ts` | 1 |
| `src/calendar/MainCalendar.tsx` | 2 |
| `tests/calendar/MainCalendar.test.tsx` | 2 |
| `src/models/Holiday.ts` | 3 |
| `src/stores/holidayStore.ts` | 3 |
| `tests/stores/holidayStore.test.ts` | 3 |
| `src/pages/ScheduleFormPage.tsx` | 4 |
| `tests/pages/ScheduleFormPage.test.tsx` | 4 |
| `src/pages/TodoFormPage.tsx` | 5 |
| `tests/pages/TodoFormPage.test.tsx` | 5 |
| `src/utils/todoActions.ts` | 5 |
| `src/components/TopToolbar.tsx` | 6 |
| `tests/components/TopToolbar.test.tsx` | 6 |
| `src/components/CreateEventButton.tsx` | 7 |
| `tests/components/CreateEventButton.test.tsx` | 7 |

**병렬 가능**: Task 3, 7은 독립적. Task 4, 5는 Task 1 완료 후 병렬 가능. Task 6은 Task 1, 2 완료 후.

---

### Task 1: calendarEventsStore 년도 단위 캐시 전환

**Files:**
- Modify: `src/stores/calendarEventsStore.ts`
- Modify: `src/utils/eventTimeUtils.ts`
- Modify: `tests/stores/calendarEventsStore.test.ts`

- [ ] **Step 1: eventTimeUtils에 yearRange 헬퍼 추가 테스트 작성**

`tests/utils/eventTimeUtils.test.ts`에 추가:

```ts
describe('yearRange', () => {
  it('주어진 년도의 1월1일 00:00:00 ~ 12월31일 23:59:59 타임스탬프를 반환한다', () => {
    const range = yearRange(2025)
    // 2025-01-01 00:00:00 로컬
    const expectedLower = Math.floor(new Date(2025, 0, 1, 0, 0, 0, 0).getTime() / 1000)
    // 2025-12-31 23:59:59 로컬
    const expectedUpper = Math.floor(new Date(2025, 11, 31, 23, 59, 59, 999).getTime() / 1000)
    expect(range.lower).toBe(expectedLower)
    expect(range.upper).toBe(expectedUpper)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/utils/eventTimeUtils.test.ts`
Expected: FAIL — `yearRange` is not defined

- [ ] **Step 3: yearRange 구현**

`src/utils/eventTimeUtils.ts`에 추가:

```ts
export function yearRange(year: number): { lower: number; upper: number } {
  const first = new Date(year, 0, 1)
  const last = new Date(year, 11, 31)
  return {
    lower: dateToTimestamp(startOfDay(first)),
    upper: dateToTimestamp(endOfDay(last)),
  }
}
```

`startOfDay`, `endOfDay`를 export로 변경 (현재 private).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --run tests/utils/eventTimeUtils.test.ts`
Expected: PASS

- [ ] **Step 5: calendarEventsStore 테스트 전면 재작성**

기존 `lastRange` 기반 테스트를 `loadedYears` 기반으로 변경. `tests/stores/calendarEventsStore.test.ts` 전체를 다음으로 교체:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { getTodos: vi.fn() },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: vi.fn() },
}))

// 2025-03-31 00:00:00 UTC
const MARCH31_TIMESTAMP = 1743375600
const MARCH31_KEY = '2025-03-31'

describe('calendarEventsStore — fetchEventsForYear', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('년도를 조회하면 해당 년도 이벤트가 날짜별로 저장된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([
      { uuid: 'sch-1', name: 'Meeting', event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])

    // when
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // then
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)
    expect(events?.some(e => e.event.uuid === 'todo-1')).toBe(true)
    expect(events?.some(e => e.event.uuid === 'sch-1')).toBe(true)
    expect(useCalendarEventsStore.getState().loadedYears.has(2025)).toBe(true)
  })

  it('이미 조회한 년도는 다시 API 호출하지 않는다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // when
    vi.mocked(todoApi.getTodos).mockClear()
    vi.mocked(scheduleApi.getSchedules).mockClear()
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // then — API 재호출 없음
    expect(todoApi.getTodos).not.toHaveBeenCalled()
    expect(scheduleApi.getSchedules).not.toHaveBeenCalled()
  })

  it('다른 년도를 조회하면 기존 데이터에 병합된다', async () => {
    // given: 2025년 데이터 로드됨
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-2025', name: '2025 Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // when: 2026년 데이터 로드
    const JAN1_2026 = Math.floor(new Date(2026, 0, 1, 12, 0, 0).getTime() / 1000)
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-2026', name: '2026 Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: JAN1_2026 } },
    ])
    await useCalendarEventsStore.getState().fetchEventsForYear(2026)

    // then: 양쪽 다 조회 가능
    expect(useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)?.some(e => e.event.uuid === 'todo-2025')).toBe(true)
    expect(useCalendarEventsStore.getState().eventsByDate.get('2026-01-01')?.some(e => e.event.uuid === 'todo-2026')).toBe(true)
    expect(useCalendarEventsStore.getState().loadedYears.has(2025)).toBe(true)
    expect(useCalendarEventsStore.getState().loadedYears.has(2026)).toBe(true)
  })

  it('API 실패 시 loadedYears에 추가되지 않는다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockRejectedValue(new Error('network'))
    vi.mocked(scheduleApi.getSchedules).mockRejectedValue(new Error('network'))

    // when
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // then
    expect(useCalendarEventsStore.getState().loadedYears.has(2025)).toBe(false)
  })
})

describe('calendarEventsStore — refreshYears', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('refreshYears 호출 시 해당 년도 캐시를 무효화하고 다시 조회한다', async () => {
    // given: 2025년 로드됨
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'old', name: 'Old', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // when: 새로고침 — API가 다른 데이터 반환
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'new', name: 'New', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    await useCalendarEventsStore.getState().refreshYears([2025])

    // then: 새 데이터로 교체됨
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.some(e => e.event.uuid === 'new')).toBe(true)
    expect(events.some(e => e.event.uuid === 'old')).toBe(false)
  })
})

describe('calendarEventsStore — mutation', () => {
  beforeEach(() => {
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, loadedYears: new Set() })
    vi.clearAllMocks()
  })

  it('addEvent를 호출하면 해당 이벤트를 날짜별 목록에서 조회할 수 있다', () => {
    // given: 빈 스토어
    // when
    const newTodo = { uuid: 'new-1', name: '새 할 일', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsStore.getState().addEvent({ type: 'todo', event: newTodo })

    // then
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY)
    expect(events?.some(e => e.event.uuid === 'new-1')).toBe(true)
  })

  it('removeEvent를 호출하면 해당 이벤트를 더 이상 조회할 수 없다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // when
    useCalendarEventsStore.getState().removeEvent('todo-1')

    // then
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.some(e => e.event.uuid === 'todo-1')).toBe(false)
  })

  it('replaceEvent를 호출하면 기존 이벤트가 새 이벤트로 교체된다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: '원래 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // when
    const updated = { uuid: 'todo-1', name: '수정된 이름', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } }
    useCalendarEventsStore.getState().replaceEvent('todo-1', { type: 'todo', event: updated })

    // then
    const events = useCalendarEventsStore.getState().eventsByDate.get(MARCH31_KEY) ?? []
    expect(events.find(e => e.event.uuid === 'todo-1')?.event.name).toBe('수정된 이름')
  })

  it('reset 호출 시 초기 상태로 돌아간다', async () => {
    // given
    const { todoApi } = await import('../../src/api/todoApi')
    const { scheduleApi } = await import('../../src/api/scheduleApi')
    vi.mocked(todoApi.getTodos).mockResolvedValue([
      { uuid: 'todo-1', name: 'Task', is_current: false, event_time: { time_type: 'at' as const, timestamp: MARCH31_TIMESTAMP } },
    ])
    vi.mocked(scheduleApi.getSchedules).mockResolvedValue([])
    await useCalendarEventsStore.getState().fetchEventsForYear(2025)

    // when
    useCalendarEventsStore.getState().reset()

    // then
    const state = useCalendarEventsStore.getState()
    expect(state.eventsByDate.size).toBe(0)
    expect(state.loadedYears.size).toBe(0)
  })
})
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm test -- --run tests/stores/calendarEventsStore.test.ts`
Expected: FAIL — `fetchEventsForYear`, `loadedYears`, `refreshYears` 미정의

- [ ] **Step 7: calendarEventsStore 구현 전환**

`src/stores/calendarEventsStore.ts` 전체를 다음으로 교체:

```ts
import { create } from 'zustand'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { groupEventsByDate, eventTimeToStartDate, eventTimeToEndDate, formatDateKey, yearRange } from '../utils/eventTimeUtils'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface CalendarEventsState {
  eventsByDate: Map<string, CalendarEvent[]>
  loading: boolean
  loadedYears: Set<number>
  fetchEventsForYear: (year: number) => Promise<void>
  refreshYears: (years: number[]) => Promise<void>
  addEvent: (event: CalendarEvent) => void
  removeEvent: (uuid: string) => void
  replaceEvent: (uuid: string, next: CalendarEvent) => void
  reset: () => void
}

export const useCalendarEventsStore = create<CalendarEventsState>((set, get) => ({
  eventsByDate: new Map(),
  loading: false,
  loadedYears: new Set(),

  fetchEventsForYear: async (year: number) => {
    if (get().loadedYears.has(year)) return
    set({ loading: true })
    try {
      const range = yearRange(year)
      const [todos, schedules] = await Promise.all([
        todoApi.getTodos(range.lower, range.upper),
        scheduleApi.getSchedules(range.lower, range.upper),
      ])
      const yearEvents = groupEventsByDate(todos, schedules, range.lower, range.upper)
      const merged = new Map(get().eventsByDate)
      for (const [key, events] of yearEvents) {
        const existing = merged.get(key) ?? []
        merged.set(key, [...existing, ...events])
      }
      const newLoadedYears = new Set(get().loadedYears)
      newLoadedYears.add(year)
      set({ eventsByDate: merged, loading: false, loadedYears: newLoadedYears })
    } catch (e) {
      console.warn('이벤트 로드 실패:', e)
      set({ loading: false })
    }
  },

  refreshYears: async (years: number[]) => {
    // 해당 년도 캐시 무효화
    const newLoadedYears = new Set(get().loadedYears)
    years.forEach(y => newLoadedYears.delete(y))
    // 해당 년도 이벤트 제거
    const cleaned = new Map<string, CalendarEvent[]>()
    const yearSet = new Set(years)
    for (const [key, events] of get().eventsByDate) {
      const keyYear = parseInt(key.substring(0, 4), 10)
      if (!yearSet.has(keyYear)) {
        cleaned.set(key, events)
      }
    }
    set({ loadedYears: newLoadedYears, eventsByDate: cleaned })
    // 재조회
    await Promise.all(years.map(y => get().fetchEventsForYear(y)))
  },

  addEvent: (event: CalendarEvent) => {
    const eventTime = event.type === 'todo'
      ? (event.event.event_time ?? null)
      : event.event.event_time
    if (!eventTime) return

    const updated = new Map(get().eventsByDate)
    const start = eventTimeToStartDate(eventTime)
    const end = eventTimeToEndDate(eventTime)
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cur <= endDay) {
      const key = formatDateKey(cur)
      updated.set(key, [...(updated.get(key) ?? []), event])
      cur.setDate(cur.getDate() + 1)
    }
    set({ eventsByDate: updated })
  },

  removeEvent: (uuid: string) => {
    const { eventsByDate } = get()
    const updated = new Map<string, CalendarEvent[]>()
    for (const [key, events] of eventsByDate) {
      const filtered = events.filter(e => e.event.uuid !== uuid)
      if (filtered.length > 0) updated.set(key, filtered)
    }
    set({ eventsByDate: updated })
  },

  replaceEvent: (uuid: string, next: CalendarEvent) => {
    get().removeEvent(uuid)
    get().addEvent(next)
  },

  reset: () => set({ eventsByDate: new Map(), loading: false, loadedYears: new Set() }),
}))
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npm test -- --run tests/stores/calendarEventsStore.test.ts tests/utils/eventTimeUtils.test.ts`
Expected: ALL PASS

- [ ] **Step 9: 커밋**

```bash
git add src/stores/calendarEventsStore.ts src/utils/eventTimeUtils.ts tests/stores/calendarEventsStore.test.ts tests/utils/eventTimeUtils.test.ts
git commit -m "#54 feat(store): calendarEventsStore를 년도 단위 캐시로 전환"
```

---

### Task 2: MainCalendar 년도 단위 조회로 전환

**Files:**
- Modify: `src/calendar/MainCalendar.tsx`
- Modify: `tests/calendar/MainCalendar.test.tsx`

**Depends on:** Task 1

- [ ] **Step 1: MainCalendar 테스트 수정**

기존 테스트에서 `fetchEventsForRange` mock을 `fetchEventsForYear`로 변경. `tests/calendar/MainCalendar.test.tsx`를 읽고, `fetchEventsForRange` 참조를 모두 `fetchEventsForYear`로 변경:

```ts
// 변경 전:
const mockFetchEventsForRange = vi.fn()
vi.mocked(useCalendarEventsStore).mockImplementation((selector: any) => {
  const state = { fetchEventsForRange: mockFetchEventsForRange, eventsByDate: new Map() }
  return selector(state)
})

// 변경 후:
const mockFetchEventsForYear = vi.fn()
vi.mocked(useCalendarEventsStore).mockImplementation((selector: any) => {
  const state = { fetchEventsForYear: mockFetchEventsForYear, eventsByDate: new Map() }
  return selector(state)
})
```

테스트 assertion도 변경:
```ts
// 변경 전:
expect(mockFetchEventsForRange).toHaveBeenCalled()

// 변경 후: 현재 월의 년도로 호출됨
expect(mockFetchEventsForYear).toHaveBeenCalledWith(expect.any(Number))
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/calendar/MainCalendar.test.tsx`
Expected: FAIL

- [ ] **Step 3: MainCalendar useEffect 수정**

`src/calendar/MainCalendar.tsx`:

```ts
// 변경 전:
const fetchEventsForRange = useCalendarEventsStore(s => s.fetchEventsForRange)
// ...
useEffect(() => {
  if (days.length === 0) return
  const lower = dayRange(days[0].date).lower
  const upper = dayRange(days[days.length - 1].date).upper
  fetchEventsForRange(lower, upper)
  const years = new Set(days.map(d => d.date.getFullYear()))
  years.forEach(y => fetchHolidays(y))
}, [days, fetchEventsForRange, fetchHolidays])

// 변경 후:
const fetchEventsForYear = useCalendarEventsStore(s => s.fetchEventsForYear)
// ...
useEffect(() => {
  if (days.length === 0) return
  const years = new Set(days.map(d => d.date.getFullYear()))
  years.forEach(y => {
    fetchEventsForYear(y)
    fetchHolidays(y)
  })
}, [days, fetchEventsForYear, fetchHolidays])
```

`dayRange` import도 제거 (더 이상 사용하지 않으면).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --run tests/calendar/MainCalendar.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/calendar/MainCalendar.tsx tests/calendar/MainCalendar.test.tsx
git commit -m "#54 refactor(calendar): MainCalendar를 년도 단위 이벤트 조회로 전환"
```

---

### Task 3: Holiday API 400 에러 수정

**Files:**
- Modify: `src/models/Holiday.ts` (변경 없음 — 모델은 응답용)
- Modify: `src/stores/holidayStore.ts`
- Modify: `tests/stores/holidayStore.test.ts`

**Independent — 병렬 가능**

- [ ] **Step 1: holidayStore 테스트에 code 파라미터 검증 추가**

`tests/stores/holidayStore.test.ts`에 테스트 추가:

```ts
it('fetchHolidays는 country.code를 API의 code 파라미터로 전달한다', async () => {
  // given
  const { holidayApi } = await import('../../src/api/holidayApi')
  vi.mocked(holidayApi.getHolidays).mockResolvedValue({ items: [] })

  // when
  await useHolidayStore.getState().fetchHolidays(2026)

  // then: 기본 country의 code가 전달됨
  const state = useHolidayStore.getState()
  expect(state.country.code).toBe('KR')
})

it('refreshHolidays는 해당 년도 캐시를 무효화하고 재조회한다', async () => {
  // given: 2025년 로드됨
  const { holidayApi } = await import('../../src/api/holidayApi')
  vi.mocked(holidayApi.getHolidays).mockResolvedValue({
    items: [{ summary: '신정', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } }],
  })
  await useHolidayStore.getState().fetchHolidays(2025)

  // when: refreshHolidays 호출 — API가 다른 데이터 반환
  vi.mocked(holidayApi.getHolidays).mockResolvedValue({
    items: [{ summary: '새해', start: { date: '2025-01-01' }, end: { date: '2025-01-02' } }],
  })
  await useHolidayStore.getState().refreshHolidays([2025])

  // then: 새 데이터로 교체됨
  expect(useHolidayStore.getState().getHolidayNames('2025-01-01')).toEqual(['새해'])
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/stores/holidayStore.test.ts`
Expected: FAIL — `country.code` 미정의, `refreshHolidays` 미정의

- [ ] **Step 3: HolidayCountry에 code 추가 및 holidayStore 수정**

`src/stores/holidayStore.ts`:

```ts
export interface HolidayCountry { locale: string; region: string; code: string }

const DEFAULT_COUNTRY: HolidayCountry = { locale: 'ko', region: 'south_korea', code: 'KR' }
```

`fetchHolidays` 수정:
```ts
fetchHolidays: async (year: number) => {
  if (get().loadedYears.has(year)) return
  const { locale, code } = get().country
  try {
    const response = await holidayApi.getHolidays(year, locale, code)
    // ... 기존 로직 동일
  }
}
```

`refreshHolidays` 추가:
```ts
refreshHolidays: async (years: number[]) => {
  const newLoadedYears = new Set(get().loadedYears)
  const newHolidays = new Map(get().holidays)
  // 해당 년도 데이터 제거
  for (const [key] of newHolidays) {
    const keyYear = parseInt(key.substring(0, 4), 10)
    if (years.includes(keyYear)) newHolidays.delete(key)
  }
  years.forEach(y => newLoadedYears.delete(y))
  set({ loadedYears: newLoadedYears, holidays: newHolidays })
  // 재조회
  await Promise.all(years.map(y => get().fetchHolidays(y)))
},
```

인터페이스에도 `refreshHolidays: (years: number[]) => Promise<void>` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --run tests/stores/holidayStore.test.ts`
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add src/stores/holidayStore.ts tests/stores/holidayStore.test.ts
git commit -m "#54 fix(holiday): code 파라미터 수정 및 refreshHolidays 추가"
```

---

### Task 4: ScheduleFormPage 반복 이벤트 메모리 업데이트

**Files:**
- Modify: `src/pages/ScheduleFormPage.tsx`
- Modify: `tests/pages/ScheduleFormPage.test.tsx`

**Depends on:** Task 1 (refreshCurrentRange 제거됨)

- [ ] **Step 1: ScheduleFormPage 테스트 수정**

`tests/pages/ScheduleFormPage.test.tsx`를 읽고, `refreshCurrentRange` mock 참조를 제거. 반복 이벤트 수정/삭제 후 `removeEvent` + `addEvent` 호출을 검증하는 대신, 스토어의 공개 상태(eventsByDate)가 올바른지 검증하도록 수정.

기존 `refreshCurrentRange` 관련 검증이 있다면 제거하고, API mock이 반환하는 응답값이 스토어에 반영되는지 확인하는 테스트로 교체.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/pages/ScheduleFormPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: ScheduleFormPage에서 refreshCurrentRange 제거 및 메모리 업데이트로 교체**

`src/pages/ScheduleFormPage.tsx`:

import에서 `refreshCurrentRange` 제거:
```ts
const { addEvent, removeEvent } = useCalendarEventsStore()
```

`applyUpdate` 수정:

```ts
} else if (scope === 'all') {
  const updated = await scheduleApi.updateSchedule(id, {
    name: name.trim(),
    event_tag_id: tagId,
    event_time: eventTime,
    repeating: repeating ?? undefined,
    notification_options: notifications.length > 0 ? notifications : null,
  })
  removeEvent(id)
  addEvent({ type: 'schedule', event: updated })
} else if (scope === 'this') {
  const turn = original.show_turns?.[0] ?? 0
  const excluded = await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...(original.exclude_repeatings ?? []), turn] })
  const newSingle = await scheduleApi.createSchedule({
    name: name.trim(),
    event_tag_id: tagId ?? undefined,
    event_time: eventTime,
    repeating: undefined,
    notification_options: notifications.length > 0 ? notifications : undefined,
  })
  removeEvent(id)
  addEvent({ type: 'schedule', event: excluded })
  addEvent({ type: 'schedule', event: newSingle })
} else {
  // scope === 'future'
  const cutoff = occurrenceStart(original) - 1
  const ended = await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
  const newSeries = await scheduleApi.createSchedule({
    name: name.trim(),
    event_tag_id: tagId ?? undefined,
    event_time: eventTime,
    repeating: repeating ?? undefined,
    notification_options: notifications.length > 0 ? notifications : undefined,
  })
  removeEvent(id)
  addEvent({ type: 'schedule', event: ended })
  addEvent({ type: 'schedule', event: newSeries })
}
```

`applyDelete` 수정:

```ts
} else if (scope === 'all') {
  await scheduleApi.deleteSchedule(id)
  removeEvent(id)
} else if (scope === 'this') {
  const turn = original.show_turns?.[0] ?? 0
  const excluded = await scheduleApi.excludeRepeating(id, { exclude_repeatings: [...(original.exclude_repeatings ?? []), turn] })
  removeEvent(id)
  addEvent({ type: 'schedule', event: excluded })
} else {
  // scope === 'future'
  const cutoff = occurrenceStart(original) - 1
  const ended = await scheduleApi.updateSchedule(id, { repeating: { ...original.repeating, end: cutoff } })
  removeEvent(id)
  addEvent({ type: 'schedule', event: ended })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --run tests/pages/ScheduleFormPage.test.tsx`
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add src/pages/ScheduleFormPage.tsx tests/pages/ScheduleFormPage.test.tsx
git commit -m "#54 refactor(schedule): 반복 일정 수정/삭제 시 API 응답으로 메모리 업데이트"
```

---

### Task 5: TodoFormPage + todoActions 반복 이벤트 메모리 업데이트

**Files:**
- Modify: `src/pages/TodoFormPage.tsx`
- Modify: `src/utils/todoActions.ts`
- Modify: `tests/pages/TodoFormPage.test.tsx`

**Depends on:** Task 1

- [ ] **Step 1: TodoFormPage 테스트 수정**

`tests/pages/TodoFormPage.test.tsx`에서 `refreshCurrentRange` mock 참조를 제거. 반복 이벤트 수정/삭제 후 API 응답이 스토어에 반영되는지 확인하도록 수정.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/pages/TodoFormPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: TodoFormPage에서 refreshCurrentRange 제거 및 메모리 업데이트로 교체**

`src/pages/TodoFormPage.tsx`:

import에서 `refreshCurrentRange` 제거:
```ts
const { addEvent, removeEvent } = useCalendarEventsStore()
```

`applyUpdate` scope === 'this' 수정:
```ts
} else if (scope === 'this') {
  const next = original.event_time
    ? nextRepeatingTime(original.event_time, original.repeating_turn ?? 1, original.repeating, original.exclude_repeatings)
    : null
  const result = await todoApi.replaceTodo(id, {
    new: { name: name.trim(), event_tag_id: tagId, event_time: eventTime, notification_options: notifications.length > 0 ? notifications : undefined },
    origin_next_event_time: next?.time,
    next_repeating_turn: next?.turn,
  })
  removeEvent(id)
  if (result.new_todo.event_time) addEvent({ type: 'todo', event: result.new_todo })
  if (result.next_repeating?.event_time) addEvent({ type: 'todo', event: result.next_repeating })
```

`applyUpdate` scope === 'future' 수정:
```ts
} else {
  const startTs = original.event_time ? getStartTimestamp(original.event_time) : 0
  const cutoff = startTs - 1
  const ended = await todoApi.patchTodo(id, { repeating: { ...original.repeating, end: cutoff } })
  removeEvent(id)
  if (ended.event_time) addEvent({ type: 'todo', event: ended })
  if (eventTime) {
    const newSeries = await todoApi.createTodo({
      name: name.trim(),
      event_tag_id: tagId ?? undefined,
      event_time: eventTime,
      repeating: repeating ?? undefined,
      notification_options: notifications.length > 0 ? notifications : undefined,
    })
    if (newSeries.event_time) addEvent({ type: 'todo', event: newSeries })
  }
}
```

`applyDelete` scope === 'this' 수정:
```ts
} else if (scope === 'this') {
  const next = original.event_time
    ? nextRepeatingTime(original.event_time, original.repeating_turn ?? 1, original.repeating, original.exclude_repeatings)
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
```

`applyDelete` scope === 'future' 수정:
```ts
} else {
  const startTs = original.event_time ? getStartTimestamp(original.event_time) : 0
  const cutoff = startTs - 1
  const ended = await todoApi.patchTodo(id, { repeating: { ...original.repeating, end: cutoff } })
  removeEvent(id)
  if (ended.event_time) addEvent({ type: 'todo', event: ended })
}
```

- [ ] **Step 4: todoActions.ts에서 refreshCurrentRange 제거**

`src/utils/todoActions.ts`:

```ts
import { todoApi } from '../api/todoApi'
import { nextRepeatingTime } from './repeatingTimeCalculator'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useUncompletedTodosStore } from '../stores/uncompletedTodosStore'
import type { Todo } from '../models'

export async function skipRepeatingTodo(todo: Todo): Promise<void> {
  if (!todo.repeating || !todo.event_time) return
  const next = nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
  const { removeEvent, addEvent } = useCalendarEventsStore.getState()
  if (next) {
    const updated = await todoApi.patchTodo(todo.uuid, { event_time: next.time, repeating_turn: next.turn })
    removeEvent(todo.uuid)
    if (updated.event_time) addEvent({ type: 'todo', event: updated })
  } else {
    await todoApi.deleteTodo(todo.uuid)
    removeEvent(todo.uuid)
  }
  await refreshTodoListStores()
}

async function refreshTodoListStores(): Promise<void> {
  await Promise.all([
    useUncompletedTodosStore.getState().fetch(),
    useCurrentTodosStore.getState().fetch(),
  ]).catch(e => console.warn('Todo stores refresh failed:', e))
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- --run tests/pages/TodoFormPage.test.tsx`
Expected: ALL PASS

- [ ] **Step 6: 커밋**

```bash
git add src/pages/TodoFormPage.tsx src/utils/todoActions.ts tests/pages/TodoFormPage.test.tsx
git commit -m "#54 refactor(todo): 반복 할일 수정/삭제 시 API 응답으로 메모리 업데이트"
```

---

### Task 6: TopToolbar 새로고침 버튼 추가

**Files:**
- Modify: `src/components/TopToolbar.tsx`
- Modify: `tests/components/TopToolbar.test.tsx`

**Depends on:** Task 1 (refreshYears), Task 3 (refreshHolidays)

- [ ] **Step 1: TopToolbar 테스트에 새로고침 버튼 테스트 추가**

`tests/components/TopToolbar.test.tsx`에 추가:

```ts
it('새로고침 버튼을 클릭하면 현재 보고 있는 년도의 이벤트와 공휴일을 재조회한다', async () => {
  // given: 화면에 TopToolbar가 렌더됨
  render(<MemoryRouter><TopToolbar /></MemoryRouter>)

  // when: 새로고침 버튼 클릭
  await userEvent.click(screen.getByLabelText(/새로고침|refresh/i))

  // then: refreshYears와 refreshHolidays가 호출됨
  expect(mockRefreshYears).toHaveBeenCalled()
  expect(mockRefreshHolidays).toHaveBeenCalled()
})
```

mock 설정에 `refreshYears`, `refreshHolidays` 추가.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- --run tests/components/TopToolbar.test.tsx`
Expected: FAIL

- [ ] **Step 3: TopToolbar에 새로고침 버튼 구현**

`src/components/TopToolbar.tsx`:

import 추가:
```ts
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useHolidayStore } from '../stores/holidayStore'
import { buildCalendarGrid } from '../calendar/calendarUtils'
```

컴포넌트 내부에 추가:
```ts
const refreshYears = useCalendarEventsStore(s => s.refreshYears)
const refreshHolidays = useHolidayStore(s => s.refreshHolidays)
const loading = useCalendarEventsStore(s => s.loading)

function handleRefresh() {
  const today = new Date()
  const days = buildCalendarGrid(year, month, today)
  const years = [...new Set(days.map(d => d.date.getFullYear()))]
  refreshYears(years)
  refreshHolidays(years)
}
```

우측 영역(Archive 버튼 앞)에 버튼 추가:
```tsx
<button
  onClick={handleRefresh}
  disabled={loading}
  aria-label={t('main.refresh', '새로고침')}
  className="rounded-full p-2 hover:bg-gray-100 text-gray-500 disabled:opacity-50"
>
  <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
</button>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --run tests/components/TopToolbar.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/TopToolbar.tsx tests/components/TopToolbar.test.tsx
git commit -m "#54 feat(toolbar): 새로고침 버튼 추가 — 현재 년도 이벤트/공휴일 재조회"
```

---

### Task 7: CreateEventButton 디자인 수정 (#52)

**Files:**
- Modify: `src/components/CreateEventButton.tsx`
- Modify: `tests/components/CreateEventButton.test.tsx`

**Independent — 병렬 가능**

- [ ] **Step 1: CreateEventButton 테스트 확인**

기존 테스트를 읽고, 디자인 변경으로 깨지는 부분이 없는지 확인. 기능 테스트(클릭 → 드롭다운, 선택 → openForm 호출)는 그대로 유지.

- [ ] **Step 2: CreateEventButton 스타일 수정**

`src/components/CreateEventButton.tsx`의 버튼 스타일을 좌측 사이드바 버튼과 통일:

```tsx
<button
  ref={buttonRef}
  data-testid="create-event-button"
  aria-label="새 이벤트"
  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white border border-gray-200 px-4 py-2.5 w-full shadow-sm hover:shadow transition-shadow"
  onClick={() => setShowMenu(!showMenu)}
>
  <svg className="h-4 w-4 text-[#323232]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  <span className="text-sm font-medium text-[#323232]">
    {t('main.create_event', 'Create')}
  </span>
  <svg className="h-3 w-3 text-[#969696] ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
</button>
```

드롭다운 메뉴 위치를 상단으로 변경 (하단에 있는 버튼이므로):
```tsx
<div className="absolute bottom-full left-0 mb-1 z-50 w-full overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl">
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test -- --run tests/components/CreateEventButton.test.tsx`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/components/CreateEventButton.tsx tests/components/CreateEventButton.test.tsx
git commit -m "#52 fix(button): 우측 패널 새 이벤트 버튼을 좌측 사이드바 스타일로 통일"
```

---

## 실행 순서 요약

```
Task 1 (calendarEventsStore) ──┬──→ Task 2 (MainCalendar) ──→ Task 6 (TopToolbar 새로고침)
                               ├──→ Task 4 (ScheduleFormPage)
                               └──→ Task 5 (TodoFormPage + todoActions)

Task 3 (Holiday API) ──────────────────────────────────→ Task 6 (TopToolbar 새로고침)

Task 7 (CreateEventButton) ── 독립
```

**1차 병렬**: Task 1 + Task 3 + Task 7
**2차 병렬**: Task 2 + Task 4 + Task 5 (Task 1 완료 후)
**3차**: Task 6 (Task 2, 3 완료 후)
