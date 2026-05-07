import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../src/api/settingApi', () => ({ settingApi: {} }))

import { TagRepository } from '../../src/repositories/TagRepository'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useCurrentTodosCache } from '../../src/repositories/caches/currentTodosCache'
import { useUncompletedTodosCache } from '../../src/repositories/caches/uncompletedTodosCache'
import type { EventTag } from '../../src/models/EventTag'
import type { DefaultTagColors } from '../../src/models/DefaultTagColors'
import type { EventTagApi } from '../../src/repositories/TagRepository'
import type { SettingApi } from '../../src/repositories/TagRepository'
import type { Todo } from '../../src/models/Todo'

// ──────────────────────── helpers ────────────────────────

function makeTag(override: Partial<EventTag> & { uuid: string }): EventTag {
  return {
    uuid: override.uuid,
    name: override.name ?? '태그',
    color_hex: override.color_hex ?? '#aabbcc',
    ...override,
  }
}

function makeFakeEventTagApi(overrides: Partial<EventTagApi> = {}): EventTagApi {
  return {
    getAllTags: overrides.getAllTags ?? vi.fn(async () => []),
    createTag: overrides.createTag ?? vi.fn(async () => makeTag({ uuid: 'created' })),
    updateTag: overrides.updateTag ?? vi.fn(async () => makeTag({ uuid: 'updated' })),
    deleteTag: overrides.deleteTag ?? vi.fn(async () => ({ status: 'ok' })),
    deleteTagAndEvents: overrides.deleteTagAndEvents ?? vi.fn(async () => ({ status: 'ok' })),
  }
}

function makeFakeSettingApi(overrides: Partial<SettingApi> = {}): SettingApi {
  return {
    getDefaultTagColors: overrides.getDefaultTagColors ?? vi.fn(async () => ({ default: '#111111', holiday: '#222222' })),
    updateDefaultTagColors: overrides.updateDefaultTagColors ?? vi.fn(async () => ({ default: '#111111', holiday: '#222222' })),
  }
}

function makeTodo(uuid: string, event_tag_id?: string | null): Todo {
  return { uuid, name: `todo-${uuid}`, is_current: true, event_time: null, event_tag_id: event_tag_id ?? null }
}

function resetCache() {
  useEventTagListCache.getState().reset()
  useCurrentTodosCache.getState().reset()
  useUncompletedTodosCache.getState().reset()
}

// ──────────────────────── fetchAll ────────────────────────

describe('TagRepository — fetchAll', () => {
  beforeEach(resetCache)

  it('API 응답 태그 목록과 기본 색상이 캐시에 반영된다', async () => {
    // given
    const tags = [makeTag({ uuid: 't1', color_hex: '#ff0000' }), makeTag({ uuid: 't2', color_hex: '#00ff00' })]
    const colors: DefaultTagColors = { default: '#aaaaaa', holiday: '#bbbbbb' }
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ getAllTags: vi.fn(async () => tags) }),
      settingApi: makeFakeSettingApi({ getDefaultTagColors: vi.fn(async () => colors) }),
    })

    // when
    await repo.fetchAll()

    // then
    expect(repo.getTagsSnapshot().find(t => t.uuid === 't1')?.color_hex).toBe('#ff0000')
    expect(repo.getTagsSnapshot().find(t => t.uuid === 't2')?.color_hex).toBe('#00ff00')
    expect(repo.getDefaultColorsSnapshot()).toEqual(colors)
  })

  it('settingApi 실패 시 기본 색상은 null 로 처리되고 태그 목록은 반영된다', async () => {
    // given
    const tags = [makeTag({ uuid: 't1' })]
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ getAllTags: vi.fn(async () => tags) }),
      settingApi: makeFakeSettingApi({ getDefaultTagColors: vi.fn(async () => { throw new Error('network') }) }),
    })

    // when
    await repo.fetchAll()

    // then
    expect(repo.getTagsSnapshot().find(t => t.uuid === 't1')).toBeDefined()
    expect(repo.getDefaultColorsSnapshot()).toBeNull()
  })
})

// ──────────────────────── createTag ────────────────────────

describe('TagRepository — createTag', () => {
  beforeEach(resetCache)

  it('태그 생성 후 캐시에 새 태그가 추가된다', async () => {
    // given
    const created = makeTag({ uuid: 'new-id', name: '신규', color_hex: '#ff0000' })
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ createTag: vi.fn(async () => created) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    const result = await repo.createTag('신규', '#ff0000')

    // then
    expect(result.uuid).toBe('new-id')
    expect(repo.getTagsSnapshot().find(t => t.uuid === 'new-id')?.name).toBe('신규')
  })
})

// ──────────────────────── updateTag ────────────────────────

describe('TagRepository — updateTag', () => {
  beforeEach(resetCache)

  it('태그 수정 후 캐시의 해당 태그가 갱신된다', async () => {
    // given
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-1', color_hex: '#ff0000' }))
    const updated = makeTag({ uuid: 'tag-1', color_hex: '#0000ff' })
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ updateTag: vi.fn(async () => updated) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    await repo.updateTag('tag-1', { color_hex: '#0000ff' })

    // then
    expect(repo.getTagsSnapshot().find(t => t.uuid === 'tag-1')?.color_hex).toBe('#0000ff')
  })
})

// ──────────────────────── updateDefaultTagColor ────────────────────────

describe('TagRepository — updateDefaultTagColor', () => {
  beforeEach(() => {
    resetCache()
    useEventTagListCache.getState().setDefaultColors({ default: '#111111', holiday: '#222222' })
  })

  it("kind='default' 색상 변경 후 캐시의 default 색상이 갱신된다", async () => {
    // given
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi(),
      settingApi: makeFakeSettingApi({
        updateDefaultTagColors: vi.fn(async () => ({ default: '#00ff00', holiday: '#222222' })),
      }),
    })

    // when
    await repo.updateDefaultTagColor('default', '#00ff00')

    // then
    expect(repo.getDefaultColorsSnapshot()?.default).toBe('#00ff00')
    expect(repo.getDefaultColorsSnapshot()?.holiday).toBe('#222222')
  })

  it("kind='holiday' 색상 변경 후 캐시의 holiday 색상이 갱신된다", async () => {
    // given
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi(),
      settingApi: makeFakeSettingApi({
        updateDefaultTagColors: vi.fn(async () => ({ default: '#111111', holiday: '#abcdef' })),
      }),
    })

    // when
    await repo.updateDefaultTagColor('holiday', '#abcdef')

    // then
    expect(repo.getDefaultColorsSnapshot()?.holiday).toBe('#abcdef')
    expect(repo.getDefaultColorsSnapshot()?.default).toBe('#111111')
  })
})

// ──────────────────────── deleteTag ────────────────────────

describe('TagRepository — deleteTag', () => {
  beforeEach(resetCache)

  it('태그 삭제 후 캐시에서 제거된다', async () => {
    // given
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-1' }))
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ deleteTag: vi.fn(async () => ({ status: 'ok' })) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    await repo.deleteTag('tag-1')

    // then
    expect(repo.getTagsSnapshot().find(t => t.uuid === 'tag-1')).toBeUndefined()
  })
})

// ──────────────────────── deleteTagAndEvents ────────────────────────

describe('TagRepository — deleteTagAndEvents', () => {
  beforeEach(resetCache)

  it('태그+이벤트 삭제 후 해당 태그가 캐시에서 제거된다', async () => {
    // given
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-x' }))
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ deleteTagAndEvents: vi.fn(async () => ({ status: 'ok' })) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    await repo.deleteTagAndEvents('tag-x')

    // then
    expect(repo.getTagsSnapshot().find(t => t.uuid === 'tag-x')).toBeUndefined()
  })

  it('삭제된 태그를 가진 todo가 currentTodosCache에서 즉시 제거된다', async () => {
    // given
    useCurrentTodosCache.setState({
      todos: [
        makeTodo('todo-1', 'tag-x'),
        makeTodo('todo-2', 'tag-y'),  // 다른 태그 — 유지돼야 함
        makeTodo('todo-3', null),     // 태그 없음 — 유지돼야 함
      ],
    })
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-x' }))
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ deleteTagAndEvents: vi.fn(async () => ({ status: 'ok' })) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    await repo.deleteTagAndEvents('tag-x')

    // then: tag-x를 가진 todo-1 만 제거됨
    const todos = useCurrentTodosCache.getState().todos
    expect(todos.some(t => t.uuid === 'todo-1')).toBe(false)
    expect(todos.some(t => t.uuid === 'todo-2')).toBe(true)
    expect(todos.some(t => t.uuid === 'todo-3')).toBe(true)
  })

  it('삭제된 태그를 가진 todo가 uncompletedTodosCache에서 즉시 제거된다', async () => {
    // given
    useUncompletedTodosCache.setState({
      todos: [
        makeTodo('todo-a', 'tag-x'),
        makeTodo('todo-b', 'tag-z'),  // 다른 태그 — 유지
      ],
    })
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-x' }))
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ deleteTagAndEvents: vi.fn(async () => ({ status: 'ok' })) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    await repo.deleteTagAndEvents('tag-x')

    // then: tag-x를 가진 todo-a 만 제거됨
    const todos = useUncompletedTodosCache.getState().todos
    expect(todos.some(t => t.uuid === 'todo-a')).toBe(false)
    expect(todos.some(t => t.uuid === 'todo-b')).toBe(true)
  })

  it('todo 캐시에 태그 id와 일치하는 항목이 없으면 캐시가 그대로 유지된다', async () => {
    // given
    useCurrentTodosCache.setState({ todos: [makeTodo('todo-1', 'other-tag')] })
    useUncompletedTodosCache.setState({ todos: [makeTodo('todo-2', 'other-tag')] })
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-x' }))
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ deleteTagAndEvents: vi.fn(async () => ({ status: 'ok' })) }),
      settingApi: makeFakeSettingApi(),
    })

    // when
    await repo.deleteTagAndEvents('tag-x')

    // then: 다른 태그 todo는 그대로 남아 있어야 함
    expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 'todo-1')).toBe(true)
    expect(useUncompletedTodosCache.getState().todos.some(t => t.uuid === 'todo-2')).toBe(true)
  })

  it('eventRepo 없이도 todo 캐시 in-memory transform이 동작한다', async () => {
    // given: eventRepo 미주입
    useCurrentTodosCache.setState({ todos: [makeTodo('todo-1', 'tag-x')] })
    useEventTagListCache.getState().add(makeTag({ uuid: 'tag-x' }))
    const repo = new TagRepository({
      eventTagApi: makeFakeEventTagApi({ deleteTagAndEvents: vi.fn(async () => ({ status: 'ok' })) }),
      settingApi: makeFakeSettingApi(),
      // eventRepo 미주입
    })

    // when
    await repo.deleteTagAndEvents('tag-x')

    // then: eventRepo 없어도 currentTodos에서 제거됨
    expect(useCurrentTodosCache.getState().todos.some(t => t.uuid === 'todo-1')).toBe(false)
  })
})
