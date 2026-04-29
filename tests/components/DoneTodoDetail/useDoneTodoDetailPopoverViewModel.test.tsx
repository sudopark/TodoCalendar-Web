import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDoneTodoDetailPopoverViewModel } from '../../../src/components/DoneTodoDetail/useDoneTodoDetailPopoverViewModel'
import { useDoneTodosCache } from '../../../src/repositories/caches/doneTodosCache'
import { useCurrentTodosCache } from '../../../src/repositories/caches/currentTodosCache'
import type { DoneTodo } from '../../../src/models'

const mockGetDoneTodoDetail = vi.fn()
const mockRevertDoneTodo = vi.fn(async () => ({ uuid: 'd-1', name: '완료된 일', is_current: true }))
const mockDeleteDoneTodo = vi.fn(async () => ({ status: 'ok' }))

vi.mock('../../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(async () => []),
    deleteDoneTodo: (id: string) => mockDeleteDoneTodo(id),
    revertDoneTodo: (id: string) => mockRevertDoneTodo(id),
    getDoneTodoDetail: (id: string) => mockGetDoneTodoDetail(id),
  },
}))

const sample: DoneTodo = {
  uuid: 'd-1',
  name: '완료된 일',
  done_at: 1714000000,
  event_tag_id: null,
  event_time: null,
  notification_options: null,
}

beforeEach(() => {
  mockGetDoneTodoDetail.mockReset()
  mockRevertDoneTodo.mockReset().mockResolvedValue({ uuid: 'd-1', name: '완료된 일', is_current: true })
  mockDeleteDoneTodo.mockReset().mockResolvedValue({ status: 'ok' })
  useDoneTodosCache.setState({ items: [sample], cursor: null, hasMore: false, isLoading: false })
  // viewmodel.revert 가 fetchCurrentTodos 까지 await — fetch 만 stub
  useCurrentTodosCache.setState({ fetch: async () => {} } as never, false)
})

describe('useDoneTodoDetailPopoverViewModel', () => {
  it('mount 시 done todo uuid 로 detail 을 조회해 노출한다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce({ url: 'https://x', memo: 'm', place: null })

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))

    await waitFor(() => expect(result.current.detail).toEqual({ url: 'https://x', memo: 'm', place: null }))
  })

  it('detail 조회가 실패하면 detail 은 null 로 떨어져도 hook 자체는 정상 사용 가능하다', async () => {
    mockGetDoneTodoDetail.mockRejectedValueOnce(new Error('404'))

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))

    // 실패 시에도 detail 은 null 로 안정화되고 revert/remove 는 사용 가능
    await waitFor(() => expect(result.current.detail).toBeNull())
    expect(typeof result.current.revert).toBe('function')
    expect(typeof result.current.remove).toBe('function')
  })

  it('revert 호출 시 cache 에서 항목이 사라진다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))

    await act(async () => {
      await result.current.revert()
    })

    expect(useDoneTodosCache.getState().items.find(i => i.uuid === sample.uuid)).toBeUndefined()
  })

  it('remove 호출 시 cache 에서 항목이 사라진다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))

    await act(async () => {
      await result.current.remove()
    })

    expect(useDoneTodosCache.getState().items.find(i => i.uuid === sample.uuid)).toBeUndefined()
  })
})
