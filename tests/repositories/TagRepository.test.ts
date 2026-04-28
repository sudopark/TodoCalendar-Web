import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase 연쇄 초기화 차단
vi.mock('../../src/firebase', () => ({ auth: {} }))
vi.mock('../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../src/api/settingApi', () => ({ settingApi: {} }))

import { TagRepository } from '../../src/repositories/TagRepository'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import type { EventTag } from '../../src/models/EventTag'
import type { DefaultTagColors } from '../../src/models/DefaultTagColors'
import type { EventTagApi } from '../../src/repositories/TagRepository'
import type { SettingApi } from '../../src/repositories/TagRepository'

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

function resetCache() {
  useEventTagListCache.getState().reset()
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
})
