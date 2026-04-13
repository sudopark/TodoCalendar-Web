import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'
import { useEventDefaultsStore } from '../../src/stores/eventDefaultsStore'
import { useCalendarEventsStore } from '../../src/stores/calendarEventsStore'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'
import { useToastStore } from '../../src/stores/toastStore'
import type { Todo, Schedule, EventTime } from '../../src/models'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { createTodo: vi.fn() },
}))

vi.mock('../../src/api/scheduleApi', () => ({
  scheduleApi: { createSchedule: vi.fn() },
}))

vi.mock('../../src/api/eventDetailApi', () => ({
  eventDetailApi: { updateEventDetail: vi.fn() },
}))

const SELECTED_DATE = new Date(2026, 3, 13, 0, 0, 0, 0) // 2026-04-13
const SELECTED_TS = Math.floor(SELECTED_DATE.getTime() / 1000)

function makeAnchorRect(): DOMRect {
  return { x: 0, y: 0, width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40, toJSON: () => ({}) } as DOMRect
}

describe('eventFormStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // reset dependent stores
    useUiStore.setState({ selectedDate: SELECTED_DATE })
    useEventDefaultsStore.setState({ defaultTagId: 'tag-1', defaultNotificationSeconds: 300 })
    useCalendarEventsStore.setState({ eventsByDate: new Map(), loading: false, lastRange: { lower: 0, upper: 9999999999 } })
    useCurrentTodosStore.setState({ todos: [] })
    useToastStore.setState({ toasts: [] })

    // reset eventFormStore
    const { useEventFormStore } = await import('../../src/stores/eventFormStore')
    useEventFormStore.setState({
      isOpen: false,
      anchorRect: null,
      eventType: 'todo',
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
    })
  })

  // MARK: - openForm

  describe('openForm', () => {
    it('폼을 열면 isOpen이 true가 되고 anchorRect가 설정된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      const rect = makeAnchorRect()

      // when
      useEventFormStore.getState().openForm(rect)

      // then
      const state = useEventFormStore.getState()
      expect(state.isOpen).toBe(true)
      expect(state.anchorRect).toBe(rect)
    })

    it('폼을 열면 selectedDate 기반으로 eventTime이 초기화된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')

      // when
      useEventFormStore.getState().openForm(makeAnchorRect())

      // then
      const state = useEventFormStore.getState()
      expect(state.eventTime).toEqual({ time_type: 'at', timestamp: SELECTED_TS })
    })

    it('selectedDate가 없으면 eventTime은 null이다', async () => {
      // given
      useUiStore.setState({ selectedDate: null })
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')

      // when
      useEventFormStore.getState().openForm(makeAnchorRect())

      // then
      expect(useEventFormStore.getState().eventTime).toBeNull()
    })

    it('폼을 열면 기본 태그와 알림이 설정된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')

      // when
      useEventFormStore.getState().openForm(makeAnchorRect())

      // then
      const state = useEventFormStore.getState()
      expect(state.eventTagId).toBe('tag-1')
      expect(state.notifications).toEqual([{ type: 'time', seconds: 300 }])
    })

    it('기본 알림이 없으면 빈 배열이다', async () => {
      // given
      useEventDefaultsStore.setState({ defaultNotificationSeconds: null })
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')

      // when
      useEventFormStore.getState().openForm(makeAnchorRect())

      // then
      expect(useEventFormStore.getState().notifications).toEqual([])
    })

    it('폼을 열면 이름과 기타 필드가 초기화된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ name: '기존 이름', place: '기존 장소', memo: '메모' })

      // when
      useEventFormStore.getState().openForm(makeAnchorRect())

      // then
      const state = useEventFormStore.getState()
      expect(state.name).toBe('')
      expect(state.place).toBe('')
      expect(state.url).toBe('')
      expect(state.memo).toBe('')
      expect(state.repeating).toBeNull()
      expect(state.error).toBeNull()
      expect(state.eventType).toBe('todo')
    })
  })

  // MARK: - closeForm

  describe('closeForm', () => {
    it('폼을 닫으면 isOpen이 false가 된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().openForm(makeAnchorRect())

      // when
      useEventFormStore.getState().closeForm()

      // then
      expect(useEventFormStore.getState().isOpen).toBe(false)
    })

    it('closeForm 호출 시 모든 폼 필드가 초기화된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().openForm(makeAnchorRect())
      useEventFormStore.getState().setName('test event')
      useEventFormStore.getState().setPlace('서울')
      useEventFormStore.getState().setUrl('https://example.com')
      useEventFormStore.getState().setMemo('메모')

      // when
      useEventFormStore.getState().closeForm()

      // then
      const state = useEventFormStore.getState()
      expect(state.isOpen).toBe(false)
      expect(state.name).toBe('')
      expect(state.place).toBe('')
      expect(state.url).toBe('')
      expect(state.memo).toBe('')
      expect(state.error).toBeNull()
    })
  })

  // MARK: - setEventType

  describe('setEventType', () => {
    it('todo에서 schedule로 변경 시 eventTime이 없으면 자동 설정된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ eventType: 'todo', eventTime: null })

      // when
      useEventFormStore.getState().setEventType('schedule')

      // then
      const state = useEventFormStore.getState()
      expect(state.eventType).toBe('schedule')
      expect(state.eventTime).toEqual({ time_type: 'at', timestamp: SELECTED_TS })
    })

    it('todo에서 schedule로 변경 시 eventTime이 이미 있으면 유지된다', async () => {
      // given
      const existingTime: EventTime = { time_type: 'period', period_start: 1000, period_end: 2000 }
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ eventType: 'todo', eventTime: existingTime })

      // when
      useEventFormStore.getState().setEventType('schedule')

      // then
      expect(useEventFormStore.getState().eventTime).toEqual(existingTime)
    })

    it('schedule에서 todo로 변경 시 eventTime이 유지된다', async () => {
      // given
      const existingTime: EventTime = { time_type: 'at', timestamp: SELECTED_TS }
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ eventType: 'schedule', eventTime: existingTime })

      // when
      useEventFormStore.getState().setEventType('todo')

      // then
      expect(useEventFormStore.getState().eventTime).toEqual(existingTime)
    })
  })

  // MARK: - setEventTime

  describe('setEventTime', () => {
    it('allday에서 non-allday로 변경 시 알림이 초기화된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({
        eventTime: { time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 },
        notifications: [{ type: 'allday', dayOffset: 0, hour: 9, minute: 0 }],
      })

      // when
      useEventFormStore.getState().setEventTime({ time_type: 'at', timestamp: 3000 })

      // then
      const state = useEventFormStore.getState()
      expect(state.eventTime).toEqual({ time_type: 'at', timestamp: 3000 })
      expect(state.notifications).toEqual([])
    })

    it('non-allday에서 allday로 변경 시 알림이 초기화된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({
        eventTime: { time_type: 'at', timestamp: 1000 },
        notifications: [{ type: 'time', seconds: 300 }],
      })

      // when
      useEventFormStore.getState().setEventTime({ time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 })

      // then
      expect(useEventFormStore.getState().notifications).toEqual([])
    })

    it('같은 allday 타입 내에서 변경 시 알림이 유지된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      const notifications = [{ type: 'allday' as const, dayOffset: 0, hour: 9, minute: 0 }]
      useEventFormStore.setState({
        eventTime: { time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 },
        notifications,
      })

      // when
      useEventFormStore.getState().setEventTime({ time_type: 'allday', period_start: 3000, period_end: 4000, seconds_from_gmt: 32400 })

      // then
      expect(useEventFormStore.getState().notifications).toEqual(notifications)
    })

    it('non-allday에서 non-allday로 변경 시 알림이 유지된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      const notifications = [{ type: 'time' as const, seconds: 300 }]
      useEventFormStore.setState({
        eventTime: { time_type: 'at', timestamp: 1000 },
        notifications,
      })

      // when
      useEventFormStore.getState().setEventTime({ time_type: 'period', period_start: 2000, period_end: 3000 })

      // then
      expect(useEventFormStore.getState().notifications).toEqual(notifications)
    })

    it('null에서 allday로 변경 시 알림이 초기화된다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({
        eventTime: null,
        notifications: [{ type: 'time', seconds: 300 }],
      })

      // when
      useEventFormStore.getState().setEventTime({ time_type: 'allday', period_start: 1000, period_end: 2000, seconds_from_gmt: 32400 })

      // then
      expect(useEventFormStore.getState().notifications).toEqual([])
    })
  })

  // MARK: - canSave

  describe('canSave', () => {
    it('이름이 비어있으면 저장할 수 없다', async () => {
      // given
      const { canSave } = await import('../../src/stores/eventFormStore')
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ name: '', eventType: 'todo' })

      // then
      expect(canSave(useEventFormStore.getState())).toBe(false)
    })

    it('이름이 공백만 있어도 저장할 수 없다', async () => {
      // given
      const { canSave } = await import('../../src/stores/eventFormStore')
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ name: '   ', eventType: 'todo' })

      // then
      expect(canSave(useEventFormStore.getState())).toBe(false)
    })

    it('todo는 이름만 있으면 저장할 수 있다', async () => {
      // given
      const { canSave } = await import('../../src/stores/eventFormStore')
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ name: '할일', eventType: 'todo', eventTime: null })

      // then
      expect(canSave(useEventFormStore.getState())).toBe(true)
    })

    it('schedule은 이름과 eventTime이 모두 있어야 저장할 수 있다', async () => {
      // given
      const { canSave } = await import('../../src/stores/eventFormStore')
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({
        name: '일정',
        eventType: 'schedule',
        eventTime: { time_type: 'at', timestamp: SELECTED_TS },
      })

      // then
      expect(canSave(useEventFormStore.getState())).toBe(true)
    })

    it('schedule인데 eventTime이 없으면 저장할 수 없다', async () => {
      // given
      const { canSave } = await import('../../src/stores/eventFormStore')
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ name: '일정', eventType: 'schedule', eventTime: null })

      // then
      expect(canSave(useEventFormStore.getState())).toBe(false)
    })
  })

  // MARK: - calculateDDay

  describe('calculateDDay', () => {
    it('eventTime이 null이면 null을 반환한다', async () => {
      const { calculateDDay } = await import('../../src/stores/eventFormStore')
      expect(calculateDDay(null)).toBeNull()
    })

    it('at 타입의 timestamp 기반으로 D-Day를 계산한다', async () => {
      const { calculateDDay } = await import('../../src/stores/eventFormStore')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const threeDaysLater = new Date(today)
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)
      const ts = Math.floor(threeDaysLater.getTime() / 1000)

      expect(calculateDDay({ time_type: 'at', timestamp: ts })).toBe(3)
    })

    it('period 타입은 period_start 기반으로 D-Day를 계산한다', async () => {
      const { calculateDDay } = await import('../../src/stores/eventFormStore')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const ts = Math.floor(yesterday.getTime() / 1000)

      expect(calculateDDay({ time_type: 'period', period_start: ts, period_end: ts + 86400 })).toBe(-1)
    })

    it('오늘이면 0을 반환한다', async () => {
      const { calculateDDay } = await import('../../src/stores/eventFormStore')
      const today = new Date()
      today.setHours(12, 0, 0, 0) // noon
      const ts = Math.floor(today.getTime() / 1000)

      expect(calculateDDay({ time_type: 'at', timestamp: ts })).toBe(0)
    })
  })

  // MARK: - save (todo)

  describe('save (todo)', () => {
    it('todo를 생성하고 캘린더와 현재할일에 추가한다', async () => {
      // given
      const { todoApi } = await import('../../src/api/todoApi')
      const { eventDetailApi } = await import('../../src/api/eventDetailApi')
      const createdTodo: Todo = {
        uuid: 'new-todo-1',
        name: '새 할일',
        is_current: true,
        event_time: { time_type: 'at', timestamp: SELECTED_TS },
        event_tag_id: 'tag-1',
      }
      vi.mocked(todoApi.createTodo).mockResolvedValue(createdTodo)
      vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().openForm(makeAnchorRect())
      useEventFormStore.setState({ name: '새 할일', place: '서울', url: '', memo: '' })

      // when
      await useEventFormStore.getState().save()

      // then: 캘린더에 추가됨
      const events = useCalendarEventsStore.getState().eventsByDate
      const hasEvent = Array.from(events.values()).flat().some(e => e.event.uuid === 'new-todo-1')
      expect(hasEvent).toBe(true)

      // then: 현재 할일에 추가됨
      const currentTodos = useCurrentTodosStore.getState().todos
      expect(currentTodos.some(t => t.uuid === 'new-todo-1')).toBe(true)

      // then: 폼이 닫힘
      expect(useEventFormStore.getState().isOpen).toBe(false)
    })

    it('is_current가 false인 todo는 현재할일에 추가되지 않는다', async () => {
      // given
      const { todoApi } = await import('../../src/api/todoApi')
      const createdTodo: Todo = {
        uuid: 'new-todo-2',
        name: '미래 할일',
        is_current: false,
        event_time: { time_type: 'at', timestamp: SELECTED_TS },
      }
      vi.mocked(todoApi.createTodo).mockResolvedValue(createdTodo)

      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().openForm(makeAnchorRect())
      useEventFormStore.setState({ name: '미래 할일' })

      // when
      await useEventFormStore.getState().save()

      // then
      expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'new-todo-2')).toBe(false)
    })

    it('event_time이 없는 todo는 캘린더에 추가되지 않는다', async () => {
      // given
      const { todoApi } = await import('../../src/api/todoApi')
      const createdTodo: Todo = {
        uuid: 'new-todo-3',
        name: '시간없는 할일',
        is_current: true,
      }
      vi.mocked(todoApi.createTodo).mockResolvedValue(createdTodo)

      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ isOpen: true, name: '시간없는 할일', eventType: 'todo', eventTime: null })

      // when
      await useEventFormStore.getState().save()

      // then: 캘린더에는 없고 현재 할일에만 있음
      const events = useCalendarEventsStore.getState().eventsByDate
      const hasEvent = Array.from(events.values()).flat().some(e => e.event.uuid === 'new-todo-3')
      expect(hasEvent).toBe(false)
      expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'new-todo-3')).toBe(true)
    })

    it('place/url/memo가 있으면 eventDetail도 저장된다', async () => {
      // given
      const { todoApi } = await import('../../src/api/todoApi')
      const { eventDetailApi } = await import('../../src/api/eventDetailApi')
      const createdTodo: Todo = { uuid: 'todo-detail', name: '할일', is_current: true }
      vi.mocked(todoApi.createTodo).mockResolvedValue(createdTodo)
      vi.mocked(eventDetailApi.updateEventDetail).mockResolvedValue({})

      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({
        isOpen: true, eventType: 'todo', name: '할일',
        place: '서울', url: 'https://example.com', memo: '메모',
      })

      // when
      await useEventFormStore.getState().save()

      // then: 폼이 정상 닫힘 (에러 없이 detail 저장 완료)
      expect(useEventFormStore.getState().isOpen).toBe(false)
      expect(useEventFormStore.getState().error).toBeNull()
    })
  })

  // MARK: - save (schedule)

  describe('save (schedule)', () => {
    it('schedule을 생성하고 캘린더에 추가한다', async () => {
      // given
      const { scheduleApi } = await import('../../src/api/scheduleApi')
      const createdSchedule: Schedule = {
        uuid: 'new-sch-1',
        name: '새 일정',
        event_time: { time_type: 'at', timestamp: SELECTED_TS },
      }
      vi.mocked(scheduleApi.createSchedule).mockResolvedValue(createdSchedule)

      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().openForm(makeAnchorRect())
      useEventFormStore.setState({
        eventType: 'schedule',
        name: '새 일정',
        eventTime: { time_type: 'at', timestamp: SELECTED_TS },
      })

      // when
      await useEventFormStore.getState().save()

      // then: 캘린더에 추가됨
      const events = useCalendarEventsStore.getState().eventsByDate
      const hasEvent = Array.from(events.values()).flat().some(e => e.event.uuid === 'new-sch-1')
      expect(hasEvent).toBe(true)

      // then: 폼이 닫힘
      expect(useEventFormStore.getState().isOpen).toBe(false)
    })
  })

  // MARK: - save concurrent

  describe('save concurrent', () => {
    it('이미 저장 중이면 중복 저장 요청을 무시한다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().openForm(null)
      useEventFormStore.getState().setName('test')
      useEventFormStore.setState({ saving: true })

      // when
      await useEventFormStore.getState().save()

      // then: 폼이 여전히 열려있고 에러 없음 (저장이 실행되지 않았으므로)
      expect(useEventFormStore.getState().isOpen).toBe(true)
      expect(useEventFormStore.getState().error).toBeNull()
    })
  })

  // MARK: - save validation

  describe('save validation', () => {
    it('이름이 비어있으면 저장하지 않는다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ isOpen: true, name: '', eventType: 'todo' })

      // when
      await useEventFormStore.getState().save()

      // then: 폼이 여전히 열려있음
      expect(useEventFormStore.getState().isOpen).toBe(true)
    })

    it('schedule인데 eventTime이 없으면 저장하지 않는다', async () => {
      // given
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({ isOpen: true, name: '일정', eventType: 'schedule', eventTime: null })

      // when
      await useEventFormStore.getState().save()

      // then: 폼이 여전히 열려있음
      expect(useEventFormStore.getState().isOpen).toBe(true)
    })
  })

  // MARK: - save error

  describe('save error', () => {
    it('API 에러 시 error가 설정되고 폼은 열려있다', async () => {
      // given
      const { todoApi } = await import('../../src/api/todoApi')
      vi.mocked(todoApi.createTodo).mockRejectedValue(new Error('네트워크 오류'))

      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.setState({
        isOpen: true, eventType: 'todo', name: '할일',
        eventTime: { time_type: 'at', timestamp: SELECTED_TS },
      })

      // when
      await useEventFormStore.getState().save()

      // then
      expect(useEventFormStore.getState().error).toBeTruthy()
      expect(useEventFormStore.getState().isOpen).toBe(true)
      expect(useEventFormStore.getState().saving).toBe(false)
    })
  })

  // MARK: - simple setters

  describe('setters', () => {
    it('setName으로 이름을 변경할 수 있다', async () => {
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().setName('새이름')
      expect(useEventFormStore.getState().name).toBe('새이름')
    })

    it('setEventTagId로 태그를 변경할 수 있다', async () => {
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().setEventTagId('tag-2')
      expect(useEventFormStore.getState().eventTagId).toBe('tag-2')
    })

    it('setRepeating으로 반복 설정을 변경할 수 있다', async () => {
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      const repeating = { start: 1000, option: { optionType: 'every_day' as const, interval: 1 } }
      useEventFormStore.getState().setRepeating(repeating)
      expect(useEventFormStore.getState().repeating).toEqual(repeating)
    })

    it('setPlace/setUrl/setMemo로 상세 정보를 변경할 수 있다', async () => {
      const { useEventFormStore } = await import('../../src/stores/eventFormStore')
      useEventFormStore.getState().setPlace('서울')
      useEventFormStore.getState().setUrl('https://example.com')
      useEventFormStore.getState().setMemo('메모')
      const state = useEventFormStore.getState()
      expect(state.place).toBe('서울')
      expect(state.url).toBe('https://example.com')
      expect(state.memo).toBe('메모')
    })
  })
})
