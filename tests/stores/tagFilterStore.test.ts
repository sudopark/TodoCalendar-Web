import { describe, it, expect, beforeEach } from 'vitest'
import { useTagFilterStore } from '../../src/stores/tagFilterStore'

const STORAGE_KEY = 'hidden_tag_ids'

describe('tagFilterStore — removeTag', () => {
  beforeEach(() => {
    localStorage.clear()
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('hiddenTagIds에 존재하는 id를 제거하면 집합에서 빠지고 localStorage도 갱신된다', () => {
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1', 'tag-2']) })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['tag-1', 'tag-2']))

    useTagFilterStore.getState().removeTag('tag-1')

    expect(useTagFilterStore.getState().isTagHidden('tag-1')).toBe(false)
    expect(useTagFilterStore.getState().isTagHidden('tag-2')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['tag-2'])
  })

  it('hiddenTagIds에 없는 id를 제거 요청해도 상태가 변하지 않는다', () => {
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['tag-1']))

    useTagFilterStore.getState().removeTag('non-existent')

    expect(useTagFilterStore.getState().isTagHidden('tag-1')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['tag-1'])
  })

  it('마지막 id를 제거하면 localStorage에 빈 배열이 저장된다', () => {
    useTagFilterStore.setState({ hiddenTagIds: new Set(['only-tag']) })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['only-tag']))

    useTagFilterStore.getState().removeTag('only-tag')

    expect(useTagFilterStore.getState().isTagHidden('only-tag')).toBe(false)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual([])
  })
})

describe('tagFilterStore — 기존 toggleTag 회귀', () => {
  beforeEach(() => {
    localStorage.clear()
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('toggleTag로 id를 숨기면 isTagHidden이 true를 반환한다', () => {
    useTagFilterStore.getState().toggleTag('tag-a')

    expect(useTagFilterStore.getState().isTagHidden('tag-a')).toBe(true)
  })
})
