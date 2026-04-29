import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDoneTodoDetailPopoverViewModel } from '../../../src/components/DoneTodoDetail/useDoneTodoDetailPopoverViewModel'
import { useDoneTodosCache } from '../../../src/repositories/caches/doneTodosCache'
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
})

describe('useDoneTodoDetailPopoverViewModel', () => {
  it('mount 시 done todo uuid 로 detail 을 조회해 노출한다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce({ url: 'https://x', memo: 'm', place: null })

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))

    await waitFor(() => expect(result.current.detailLoaded).toBe(true))
    expect(result.current.detail).toEqual({ url: 'https://x', memo: 'm', place: null })
  })

  it('detail 조회가 실패해도 detailLoaded=true 가 되고 detail 은 null 로 떨어진다', async () => {
    mockGetDoneTodoDetail.mockRejectedValueOnce(new Error('404'))

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))

    await waitFor(() => expect(result.current.detailLoaded).toBe(true))
    expect(result.current.detail).toBeNull()
  })

  it('revert 호출 시 cache 에서 항목이 사라진다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))
    await waitFor(() => expect(result.current.detailLoaded).toBe(true))

    await act(async () => {
      await result.current.revert()
    })

    expect(useDoneTodosCache.getState().items.find(i => i.uuid === sample.uuid)).toBeUndefined()
  })

  it('remove 호출 시 cache 에서 항목이 사라진다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useDoneTodoDetailPopoverViewModel(sample))
    await waitFor(() => expect(result.current.detailLoaded).toBe(true))

    await act(async () => {
      await result.current.remove()
    })

    expect(useDoneTodosCache.getState().items.find(i => i.uuid === sample.uuid)).toBeUndefined()
  })
})
