import { eventTagApi } from '../api/eventTagApi'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { foremostApi } from '../api/foremostApi'
import { doneTodoApi } from '../api/doneTodoApi'
import type { EventTag, Todo, EventTime, Repeating, NotificationOption } from '../models'
import { PRESET_COLORS } from '../components/ColorPalette'

export const TEST_PREFIX = '[TEST] '

const SECOND = 1
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function tz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function secondsFromGmt(): number {
  return -(new Date().getTimezoneOffset() * 60)
}

function tsOf(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function dateAt(offsetDays: number, hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d
}

function startOfDayTs(offsetDays: number): number {
  return tsOf(dateAt(offsetDays, 0, 0))
}

function endOfDayTs(offsetDays: number): number {
  const d = dateAt(offsetDays, 23, 59)
  d.setSeconds(59, 999)
  return tsOf(d)
}

function at(date: Date): EventTime {
  return { time_type: 'at', timestamp: tsOf(date) }
}

function period(start: Date, end: Date): EventTime {
  return { time_type: 'period', period_start: tsOf(start), period_end: tsOf(end) }
}

function allday(offsetStartDays: number, offsetEndDays = offsetStartDays): EventTime {
  return {
    time_type: 'allday',
    period_start: startOfDayTs(offsetStartDays),
    period_end: endOfDayTs(offsetEndDays),
    seconds_from_gmt: secondsFromGmt(),
  }
}

function everyDay(startDate: Date): Repeating {
  return {
    start: tsOf(startDate),
    option: { optionType: 'every_day', interval: 1 },
  }
}

function everyWeek(startDate: Date, dayOfWeek: number[]): Repeating {
  return {
    start: tsOf(startDate),
    option: { optionType: 'every_week', interval: 1, dayOfWeek, timeZone: tz() },
  }
}

function everyMonthOnDays(startDate: Date, days: number[]): Repeating {
  return {
    start: tsOf(startDate),
    option: {
      optionType: 'every_month',
      interval: 1,
      monthDaySelection: { days },
      timeZone: tz(),
    },
  }
}

function notifyMinutesBefore(minutes: number): NotificationOption {
  return { type: 'time', seconds: minutes * MINUTE }
}

interface SeederTag {
  key: string
  name: string
  color_hex: string
}

// iOS suggestColorHexes 27색 팔레트 기준 의미별 인덱스
const TAGS: SeederTag[] = [
  { key: 'work', name: `${TEST_PREFIX}Work`, color_hex: PRESET_COLORS[0] },      // #F42D2D red
  { key: 'personal', name: `${TEST_PREFIX}Personal`, color_hex: PRESET_COLORS[11] }, // #1E90FF blue
  { key: 'study', name: `${TEST_PREFIX}Study`, color_hex: PRESET_COLORS[7] },    // #6800f2 purple
  { key: 'health', name: `${TEST_PREFIX}Health`, color_hex: PRESET_COLORS[20] }, // #3CB371 green
  { key: 'travel', name: `${TEST_PREFIX}Travel`, color_hex: PRESET_COLORS[4] },  // #FFA02E orange
]

interface SeedResult {
  tagCount: number
  todoCount: number
  scheduleCount: number
  doneCount: number
  foremostSet: boolean
  errors: string[]
}

function hasTestPrefix(name: string): boolean {
  return name.startsWith(TEST_PREFIX)
}

async function safe<T>(label: string, errors: string[], fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`${label}: ${msg}`)
    console.warn('[testDataSeeder]', label, e)
    return null
  }
}

export async function cleanupTestData(): Promise<string[]> {
  const errors: string[] = []

  // Foremost 해제는 항상 안전
  await safe('remove foremost', errors, () => foremostApi.removeForemostEvent())

  // 1. 태그 cascade 삭제 — 태그에 매달린 todo/schedule도 서버에서 정리됨
  const allTags = await safe('list tags', errors, () => eventTagApi.getAllTags())
  if (allTags) {
    const testTags = allTags.filter(t => hasTestPrefix(t.name))
    await Promise.allSettled(
      testTags.map(t => safe(`delete tag ${t.name}`, errors, () => eventTagApi.deleteTagAndEvents(t.uuid)))
    )
  }

  // 2. 태그 없이 생성된 test todo 정리 (is_current=true 태그 없는 것 등)
  const widePast = tsOf(dateAt(-730, 0))
  const wideFuture = tsOf(dateAt(730, 23, 59))

  const ranged = (await safe('list todos (range)', errors, () => todoApi.getTodos(widePast, wideFuture))) ?? []
  const current = (await safe('list current todos', errors, () => todoApi.getCurrentTodos())) ?? []
  const uncompleted = (await safe('list uncompleted todos', errors, () => todoApi.getUncompletedTodos(Math.floor(Date.now() / 1000)))) ?? []

  const todoById = new Map<string, Todo>()
  for (const t of [...ranged, ...current, ...uncompleted]) todoById.set(t.uuid, t)
  const leftoverTodos = [...todoById.values()].filter(t => hasTestPrefix(t.name))
  await Promise.allSettled(
    leftoverTodos.map(t => safe(`delete todo ${t.name}`, errors, () => todoApi.deleteTodo(t.uuid)))
  )

  // 3. 태그 없는 test schedule 정리
  const leftoverSchedules =
    (await safe('list schedules', errors, () => scheduleApi.getSchedules(widePast, wideFuture))) ?? []
  const testSchedules = leftoverSchedules.filter(s => hasTestPrefix(s.name))
  await Promise.allSettled(
    testSchedules.map(s =>
      safe(`delete schedule ${s.name}`, errors, () => scheduleApi.deleteSchedule(s.uuid))
    )
  )

  // 4. Done todo 정리 — 페이지네이션 순회하며 prefix 일치분만 삭제
  let cursor: number | undefined = undefined
  for (let page = 0; page < 20; page += 1) {
    const dones =
      (await safe(`list done todos page ${page}`, errors, () =>
        doneTodoApi.getDoneTodos(50, cursor)
      )) ?? []
    if (dones.length === 0) break
    const targets = dones.filter(d => hasTestPrefix(d.name))
    await Promise.allSettled(
      targets.map(d =>
        safe(`delete done ${d.name}`, errors, () => doneTodoApi.deleteDoneTodo(d.uuid))
      )
    )
    const last = dones[dones.length - 1]
    if (!last?.done_at || dones.length < 50) break
    cursor = last.done_at
  }

  return errors
}

export async function seedTestData(): Promise<SeedResult> {
  const errors: string[] = []
  const result: SeedResult = {
    tagCount: 0,
    todoCount: 0,
    scheduleCount: 0,
    doneCount: 0,
    foremostSet: false,
    errors,
  }

  // --- Tags ---
  const tagByKey = new Map<string, EventTag>()
  const createdTags = await Promise.all(
    TAGS.map(t =>
      safe(`create tag ${t.name}`, errors, () =>
        eventTagApi.createTag({ name: t.name, color_hex: t.color_hex })
      ).then(tag => ({ key: t.key, tag }))
    )
  )
  for (const { key, tag } of createdTags) {
    if (tag) {
      tagByKey.set(key, tag)
      result.tagCount += 1
    }
  }
  const tagId = (key: string): string | undefined => tagByKey.get(key)?.uuid

  // --- Todos ---
  const todoDefs: Array<{
    body: Parameters<typeof todoApi.createTodo>[0]
    setForemost?: boolean
  }> = [
    // 현재(시간없음)
    { body: { name: `${TEST_PREFIX}Reply to emails`, event_tag_id: tagId('work'), is_current: true } },
    { body: { name: `${TEST_PREFIX}Buy groceries`, event_tag_id: tagId('personal'), is_current: true } },
    { body: { name: `${TEST_PREFIX}Read book chapter`, event_tag_id: tagId('study'), is_current: true } },
    // 태그 없음
    { body: { name: `${TEST_PREFIX}Untagged task`, is_current: true } },
    // 오늘 시간지정
    {
      body: {
        name: `${TEST_PREFIX}Lunch with team`,
        event_tag_id: tagId('work'),
        event_time: at(dateAt(0, 12, 0)),
      },
      setForemost: true,
    },
    {
      body: {
        name: `${TEST_PREFIX}Dinner prep`,
        event_tag_id: tagId('personal'),
        event_time: at(dateAt(0, 18, 0)),
      },
    },
    // 매일 반복 + 알림
    {
      body: {
        name: `${TEST_PREFIX}Morning workout`,
        event_tag_id: tagId('health'),
        event_time: at(dateAt(0, 8, 0)),
        repeating: everyDay(dateAt(0, 8, 0)),
        notification_options: [notifyMinutesBefore(10)],
      },
    },
    // 미래 마감
    {
      body: {
        name: `${TEST_PREFIX}Project proposal draft`,
        event_tag_id: tagId('work'),
        event_time: at(dateAt(7, 17, 0)),
      },
    },
    {
      body: {
        name: `${TEST_PREFIX}Parents call`,
        event_tag_id: tagId('personal'),
        event_time: at(dateAt(8, 20, 0)),
      },
    },
    // 과거(놓친 것)
    {
      body: {
        name: `${TEST_PREFIX}Missed report`,
        event_tag_id: tagId('work'),
        event_time: at(dateAt(-1, 15, 0)),
      },
    },
    // 긴 이름
    {
      body: {
        name: `${TEST_PREFIX}Very very very long todo title that might overflow the UI and cause wrapping issues to verify layout`,
        event_tag_id: tagId('study'),
        event_time: at(dateAt(1, 10, 0)),
      },
    },
    // 매월 1일
    {
      body: {
        name: `${TEST_PREFIX}Monthly bills`,
        event_tag_id: tagId('personal'),
        event_time: at(dateAt(daysToNextMonthDay(1), 9, 0)),
        repeating: everyMonthOnDays(dateAt(daysToNextMonthDay(1), 9, 0), [1]),
      },
    },
  ]

  let foremostTarget: Todo | null = null
  const createdTodos = await Promise.all(
    todoDefs.map(def =>
      safe(`create todo ${def.body.name}`, errors, () => todoApi.createTodo(def.body)).then(todo => ({
        def,
        todo,
      }))
    )
  )
  for (const { def, todo } of createdTodos) {
    if (!todo) continue
    result.todoCount += 1
    if (def.setForemost) foremostTarget = todo
  }

  // --- Schedules ---
  const scheduleDefs: Array<Parameters<typeof scheduleApi.createSchedule>[0]> = [
    {
      name: `${TEST_PREFIX}Off-site day`,
      event_tag_id: tagId('work'),
      event_time: allday(0),
    },
    {
      name: `${TEST_PREFIX}Design review`,
      event_tag_id: tagId('work'),
      event_time: period(dateAt(0, 14, 0), dateAt(0, 15, 30)),
    },
    {
      name: `${TEST_PREFIX}Weekend trip`,
      event_tag_id: tagId('travel'),
      event_time: allday(1, 2),
    },
    {
      name: `${TEST_PREFIX}Gym class`,
      event_tag_id: tagId('health'),
      event_time: period(dateAt(2, 19, 0), dateAt(2, 20, 0)),
    },
    {
      name: `${TEST_PREFIX}Book club`,
      event_tag_id: tagId('study'),
      event_time: period(dateAt(3, 20, 0), dateAt(3, 21, 0)),
    },
    {
      name: `${TEST_PREFIX}Doctor visit`,
      event_tag_id: tagId('health'),
      event_time: period(dateAt(4, 10, 0), dateAt(4, 10, 30)),
    },
    (() => {
      const mondayOffset = ((1 - new Date().getDay() + 7) % 7) || 7
      const start = dateAt(mondayOffset, 10, 0)
      const end = dateAt(mondayOffset, 11, 0)
      return {
        name: `${TEST_PREFIX}Weekly standup`,
        event_tag_id: tagId('work'),
        event_time: period(start, end),
        repeating: everyWeek(start, [1]),
      }
    })(),
    {
      name: `${TEST_PREFIX}Daily meditation`,
      event_tag_id: tagId('health'),
      event_time: period(dateAt(0, 7, 0), dateAt(0, 7, 30)),
      repeating: everyDay(dateAt(0, 7, 0)),
      notification_options: [notifyMinutesBefore(5)],
    },
    {
      name: `${TEST_PREFIX}Summer vacation`,
      event_tag_id: tagId('travel'),
      event_time: allday(10, 14),
    },
    {
      name: `${TEST_PREFIX}Next month review`,
      event_tag_id: tagId('work'),
      event_time: period(dateAt(30, 15, 0), dateAt(30, 16, 0)),
    },
  ]

  const createdSchedules = await Promise.all(
    scheduleDefs.map(body =>
      safe(`create schedule ${body.name}`, errors, () => scheduleApi.createSchedule(body))
    )
  )
  for (const s of createdSchedules) if (s) result.scheduleCount += 1

  // --- Foremost ---
  if (foremostTarget) {
    const ok = await safe('set foremost', errors, () =>
      foremostApi.setForemostEvent({ event_id: foremostTarget!.uuid, is_todo: true })
    )
    if (ok) result.foremostSet = true
  }

  // --- Done todos (완료 기록용) ---
  const doneDefs: Array<Parameters<typeof todoApi.createTodo>[0]> = [
    { name: `${TEST_PREFIX}Completed task 1`, event_tag_id: tagId('work'), is_current: true },
    { name: `${TEST_PREFIX}Completed task 2`, event_tag_id: tagId('personal'), is_current: true },
    { name: `${TEST_PREFIX}Completed task 3`, event_tag_id: tagId('study'), is_current: true },
  ]
  for (const body of doneDefs) {
    const created = await safe(`create done-base ${body.name}`, errors, () => todoApi.createTodo(body))
    if (!created) continue
    const completed = await safe(`complete ${body.name}`, errors, () =>
      todoApi.completeTodo(created.uuid, { origin: created })
    )
    if (completed) result.doneCount += 1
  }

  return result
}

function daysToNextMonthDay(dayOfMonth: number): number {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 9, 0, 0, 0)
  if (target.getTime() <= now.getTime()) {
    target.setMonth(target.getMonth() + 1)
  }
  const diffMs = target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round(diffMs / (DAY * 1000))
}

export type { SeedResult }
