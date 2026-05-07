import { describe, it, expect, beforeEach } from 'vitest'
import { useDoneTodosCache } from '../../../src/repositories/caches/doneTodosCache'

const makeDone = (id: string, done_at: number | null = 1000) => ({
  uuid: id,
  name: `done-${id}`,
  done_at,
  origin_event_id: null,
  event_time: null,
  event_tag_id: null,
})

describe('useDoneTodosCache — primitive operations', () => {
  beforeEach(() => {
    useDoneTodosCache.getState().reset()
  })

  it('reset 호출 시 상태가 초기화된다', () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1')], hasMore: false, cursor: 999 })

    // when
    useDoneTodosCache.getState().reset()

    // then
    const state = useDoneTodosCache.getState()
    expect(state.items).toHaveLength(0)
    expect(state.hasMore).toBe(true)
    expect(state.cursor).toBeNull()
  })

  it('appendPage 호출 시 items 에 결과가 누적되고 cursor/hasMore 가 갱신된다', () => {
    // given
    const page1 = [makeDone('d1', 2000), makeDone('d2', 1000)]

    // when
    useDoneTodosCache.getState().appendPage(page1 as any, 1000, true)

    // then
    expect(useDoneTodosCache.getState().items).toHaveLength(2)
    expect(useDoneTodosCache.getState().cursor).toBe(1000)
    expect(useDoneTodosCache.getState().hasMore).toBe(true)
  })

  it('appendPage 를 두 번 호출하면 누적된다', () => {
    const page1 = Array.from({ length: 20 }, (_, i) => makeDone(`d${i}`, 2000 - i))
    const page2 = [makeDone('d20', 100)]

    useDoneTodosCache.getState().appendPage(page1 as any, 2000 - 19, true)
    useDoneTodosCache.getState().appendPage(page2 as any, null, false)

    expect(useDoneTodosCache.getState().items).toHaveLength(21)
    expect(useDoneTodosCache.getState().hasMore).toBe(false)
  })

  it('removeItem 호출 시 items 에서 해당 항목이 제거된다', () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1'), makeDone('d2')] })

    // when
    useDoneTodosCache.getState().removeItem('d1')

    // then
    expect(useDoneTodosCache.getState().items.map(i => i.uuid)).toEqual(['d2'])
  })

  it('removeItem 호출 시 generation 이 증가한다 (stale 응답 차단 메커니즘)', () => {
    // given
    useDoneTodosCache.setState({ items: [makeDone('d1')], generation: 0 })

    // when
    useDoneTodosCache.getState().removeItem('d1')

    // then
    expect(useDoneTodosCache.getState().generation).toBeGreaterThan(0)
  })

  it('replaceAll 호출 시 items 전체가 교체된다', () => {
    // given: 기존 items
    useDoneTodosCache.setState({ items: [makeDone('old', 9999)] })
    const newItems = [makeDone('n1', 2000), makeDone('n2', 1000)]

    // when
    useDoneTodosCache.getState().replaceAll(newItems as any)

    // then
    const state = useDoneTodosCache.getState()
    expect(state.items.map(i => i.uuid)).toEqual(['n1', 'n2'])
  })

  it('prependItem 호출 시 새 항목이 목록 최상단(인덱스 0)에 추가된다', () => {
    // given: 기존 items
    useDoneTodosCache.setState({ items: [makeDone('old1', 2000), makeDone('old2', 1000)] })
    const newDone = makeDone('new-done', 3000)

    // when
    useDoneTodosCache.getState().prependItem(newDone as any)

    // then: 새 항목이 최상단에 위치해야 한다
    const state = useDoneTodosCache.getState()
    expect(state.items[0].uuid).toBe('new-done')
    expect(state.items.map(i => i.uuid)).toEqual(['new-done', 'old1', 'old2'])
  })

  it('prependItem 호출 시 기존 목록이 비어있어도 단일 항목으로 채워진다', () => {
    // given: 빈 목록
    useDoneTodosCache.getState().reset()
    const newDone = makeDone('first-done', 5000)

    // when
    useDoneTodosCache.getState().prependItem(newDone as any)

    // then
    const state = useDoneTodosCache.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].uuid).toBe('first-done')
  })
})
