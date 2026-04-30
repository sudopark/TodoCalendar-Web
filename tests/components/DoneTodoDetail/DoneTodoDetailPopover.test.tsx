import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DoneTodoDetailPopover } from '../../../src/components/DoneTodoDetail/DoneTodoDetailPopover'
import { useDoneTodosCache } from '../../../src/repositories/caches/doneTodosCache'
import { useCurrentTodosCache } from '../../../src/repositories/caches/currentTodosCache'
import type { DoneTodo } from '../../../src/models'

const mockGetDoneTodoDetail = vi.fn()
const mockCancelDoneTodo = vi.fn(async () => ({
  reverted: { uuid: 'todo-1', name: '완료된 일', is_current: true },
  done_id: 'd-1',
}))
const mockRevertDoneTodo = vi.fn(async () => ({
  todo: { uuid: 'todo-1', name: '완료된 일', is_current: true },
  detail: null,
}))
const mockDeleteDoneTodo = vi.fn(async () => ({ status: 'ok' }))

vi.mock('../../../src/api/doneTodoApi', () => ({
  doneTodoApi: {
    getDoneTodos: vi.fn(async () => []),
    deleteDoneTodo: (id: string) => mockDeleteDoneTodo(id),
    revertDoneTodo: (id: string) => mockRevertDoneTodo(id),
    cancelDoneTodo: (body: unknown) => mockCancelDoneTodo(body),
    getDoneTodoDetail: (id: string) => mockGetDoneTodoDetail(id),
  },
}))

vi.mock('../../../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: vi.fn(async () => []) },
}))

const anchorRect: DOMRect = {
  top: 100, bottom: 120, left: 50, right: 200, width: 150, height: 20, x: 50, y: 100,
  toJSON: () => ({}),
}

const sample: DoneTodo = {
  uuid: 'd-1',
  name: '완료된 일',
  done_at: 1714000000,
  event_tag_id: null,
  event_time: null,
  notification_options: null,
}

beforeEach(() => {
  mockGetDoneTodoDetail.mockReset().mockResolvedValue(null)
  mockCancelDoneTodo.mockReset().mockResolvedValue({
    reverted: { uuid: 'todo-1', name: '완료된 일', is_current: true },
    done_id: 'd-1',
  })
  mockRevertDoneTodo.mockReset().mockResolvedValue({
    todo: { uuid: 'todo-1', name: '완료된 일', is_current: true },
    detail: null,
  })
  mockDeleteDoneTodo.mockReset().mockResolvedValue({ status: 'ok' })
  useDoneTodosCache.setState({
    items: [{ ...sample, origin_event_id: 'todo-1' }],
    cursor: null,
    hasMore: false,
    isLoading: false,
  })
  useCurrentTodosCache.getState().reset()
})

function renderPopover(overrides: Partial<{
  doneTodo: DoneTodo
  onClose: () => void
  onReverted: () => void
  onDeleted: () => void
}> = {}) {
  return render(
    <DoneTodoDetailPopover
      doneTodo={overrides.doneTodo ?? sample}
      anchorRect={anchorRect}
      onClose={overrides.onClose ?? vi.fn()}
      onReverted={overrides.onReverted ?? vi.fn()}
      onDeleted={overrides.onDeleted ?? vi.fn()}
    />,
  )
}

describe('DoneTodoDetailPopover', () => {
  it('mount 시 base 정보(이름/완료시각)와 우상단 3 버튼(되돌리기/삭제/닫기) 이 렌더된다', async () => {
    renderPopover()

    expect(screen.getByText('완료된 일')).toBeInTheDocument()
    expect(screen.getByText('완료 시각')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '되돌리기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
  })

  it('detail 응답이 비어있으면 url/메모/장소 영역은 표시되지 않는다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce(null)
    renderPopover()

    // detail fetch 가 끝난 뒤에도 url/memo/place 텍스트는 등장하지 않아야 한다
    await waitFor(() => {
      expect(screen.queryByText(/example\.com/)).toBeNull()
    })
  })

  it('detail 응답이 있으면 url/메모/장소가 표시된다', async () => {
    mockGetDoneTodoDetail.mockResolvedValueOnce({
      url: 'https://example.com/x',
      memo: '내 메모',
      place: '집',
    })
    renderPopover()

    await waitFor(() => {
      expect(screen.getByText('내 메모')).toBeInTheDocument()
    })
    expect(screen.getByText('집')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /example\.com/ })).toBeInTheDocument()
  })

  it('닫기 버튼을 클릭하면 onClose 가 호출된다', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderPopover({ onClose })

    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('ESC 키를 누르면 onClose 가 호출된다', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderPopover({ onClose })

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('되돌리기 버튼을 클릭하면 cache 에서 항목이 사라지고 onReverted 가 호출된다', async () => {
    const onReverted = vi.fn()
    const user = userEvent.setup()
    renderPopover({ onReverted })

    await user.click(screen.getByRole('button', { name: '되돌리기' }))

    await waitFor(() => {
      expect(useDoneTodosCache.getState().items.find(i => i.uuid === sample.uuid)).toBeUndefined()
    })
    expect(onReverted).toHaveBeenCalled()
  })

  it('삭제 버튼을 클릭하면 ConfirmDialog 가 열리고, 확인을 누르면 cache 에서 사라지고 onDeleted 가 호출된다', async () => {
    const onDeleted = vi.fn()
    const user = userEvent.setup()
    renderPopover({ onDeleted })

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByRole('dialog')).toBeVisible()

    // ConfirmDialog 의 확인 버튼은 기본 라벨 "확인"
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '확인' }))

    await waitFor(() => {
      expect(useDoneTodosCache.getState().items.find(i => i.uuid === sample.uuid)).toBeUndefined()
    })
    expect(onDeleted).toHaveBeenCalled()
  })
})
