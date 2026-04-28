import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))

import { useEventTagListCache } from '../../../src/repositories/caches/eventTagListCache'

describe('eventTagListCache — replaceAll', () => {
  beforeEach(() => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: null })
  })

  it('태그 목록과 기본 색상을 전달하면 캐시 상태에 반영된다', () => {
    // given
    const tags = [
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
      { uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' },
    ]
    const defaultColors = { default: '#aaaaaa', holiday: '#bbbbbb' }

    // when
    useEventTagListCache.getState().replaceAll(tags, defaultColors)

    // then
    const state = useEventTagListCache.getState()
    expect(state.tags.get('tag-1')?.color_hex).toBe('#ff0000')
    expect(state.tags.get('tag-2')?.color_hex).toBe('#00ff00')
    expect(state.defaultTagColors).toEqual({ default: '#aaaaaa', holiday: '#bbbbbb' })
  })

  it('defaultColors가 null이면 defaultTagColors가 null로 설정된다', () => {
    // given
    useEventTagListCache.setState({ defaultTagColors: { default: '#111', holiday: '#222' } })

    // when
    useEventTagListCache.getState().replaceAll([], null)

    // then
    expect(useEventTagListCache.getState().defaultTagColors).toBeNull()
  })
})

describe('eventTagListCache — add', () => {
  beforeEach(() => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: null })
  })

  it('태그를 추가하면 캐시에 포함된다', () => {
    // when
    useEventTagListCache.getState().add({ uuid: 'tag-new', name: '업무', color_hex: '#ff0000' })

    // then
    expect(useEventTagListCache.getState().tags.get('tag-new')?.name).toBe('업무')
  })
})

describe('eventTagListCache — replace', () => {
  beforeEach(() => {
    useEventTagListCache.setState({
      tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]),
      defaultTagColors: null,
    })
  })

  it('태그를 교체하면 캐시에 갱신된 값이 반영된다', () => {
    // when
    useEventTagListCache.getState().replace({ uuid: 'tag-1', name: '업무', color_hex: '#0000ff' })

    // then
    expect(useEventTagListCache.getState().tags.get('tag-1')?.color_hex).toBe('#0000ff')
  })
})

describe('eventTagListCache — remove', () => {
  beforeEach(() => {
    useEventTagListCache.setState({
      tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]),
      defaultTagColors: null,
    })
  })

  it('태그를 제거하면 캐시에서 사라진다', () => {
    // when
    useEventTagListCache.getState().remove('tag-1')

    // then
    expect(useEventTagListCache.getState().tags.has('tag-1')).toBe(false)
  })
})

describe('eventTagListCache — setDefaultColors', () => {
  beforeEach(() => {
    useEventTagListCache.setState({
      tags: new Map(),
      defaultTagColors: { default: '#111111', holiday: '#222222' },
    })
  })

  it('새 기본 색상을 설정하면 캐시에 반영된다', () => {
    // when
    useEventTagListCache.getState().setDefaultColors({ default: '#00ff00', holiday: '#abcdef' })

    // then
    expect(useEventTagListCache.getState().defaultTagColors).toEqual({ default: '#00ff00', holiday: '#abcdef' })
  })
})

describe('eventTagListCache — reset', () => {
  it('reset 호출 시 tags/defaultTagColors가 초기 상태로 돌아간다', () => {
    // given
    useEventTagListCache.setState({
      tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]),
      defaultTagColors: { default: '#123456', holiday: '#abcdef' },
    })

    // when
    useEventTagListCache.getState().reset()

    // then
    const state = useEventTagListCache.getState()
    expect(state.tags.size).toBe(0)
    expect(state.defaultTagColors).toBeNull()
  })
})
