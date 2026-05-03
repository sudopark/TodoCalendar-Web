import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagRow } from '../../../../src/pages/settings/tagManagement/TagRow'
import { useTagFilterStore } from '../../../../src/stores/tagFilterStore'
import type { TagRowModel } from '../../../../src/domain/tag/buildTagRows'

const customRow: TagRowModel = { id: 'tag-1', kind: 'custom', name: '업무', color: '#ff0000' }
const defaultRow: TagRowModel = { id: 'default', kind: 'default', name: '기본', color: '#4A90D9' }

describe('TagRow', () => {
  beforeEach(() => {
    localStorage.clear()
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('태그 이름과 색상이 표시된다', () => {
    // given / when
    render(<TagRow row={customRow} onEdit={() => {}} />)

    // then
    expect(screen.getByText('업무')).toBeInTheDocument()
  })

  it('태그가 visible(hidden=false) 상태이면 체크 아이콘이 보인다', () => {
    // given: 숨김 목록에 포함 안 됨
    // when
    render(<TagRow row={customRow} onEdit={() => {}} />)

    // then: 채워진 체크 아이콘 표시
    expect(screen.getByTestId('tag-row-check-filled')).toBeInTheDocument()
  })

  it('태그가 hidden 상태(hiddenTagIds에 포함)이면 체크 아이콘이 보이지 않는다', () => {
    // given
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })

    // when
    render(<TagRow row={customRow} onEdit={() => {}} />)

    // then
    expect(screen.queryByTestId('tag-row-check-filled')).not.toBeInTheDocument()
  })

  it('가시성 버튼을 클릭하면 태그가 hidden 상태로 전환된다', async () => {
    // given: 태그가 visible 상태
    const user = userEvent.setup()
    render(<TagRow row={customRow} onEdit={() => {}} />)

    // when
    await user.click(screen.getByRole('button', { name: '태그 표시 전환' }))

    // then: store에서 tagId가 hidden으로 토글됨
    expect(useTagFilterStore.getState().isTagHidden('tag-1')).toBe(true)
  })

  it('hidden 상태에서 가시성 버튼을 클릭하면 visible 상태로 복귀된다', async () => {
    // given: 태그가 hidden 상태
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })
    const user = userEvent.setup()
    render(<TagRow row={customRow} onEdit={() => {}} />)

    // when
    await user.click(screen.getByRole('button', { name: '태그 표시 전환' }))

    // then
    expect(useTagFilterStore.getState().isTagHidden('tag-1')).toBe(false)
  })

  it('편집(Pencil) 버튼을 클릭하면 onEdit 콜백이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<TagRow row={customRow} onEdit={onEdit} />)

    // when
    await user.click(screen.getByRole('button', { name: '태그 상세 열기' }))

    // then
    expect(onEdit).toHaveBeenCalled()
  })

  it('default 태그도 편집 버튼 클릭 시 onEdit 콜백이 호출된다', async () => {
    // given: kind=default 태그 (readonly 편집용)
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<TagRow row={defaultRow} onEdit={onEdit} />)

    // when
    await user.click(screen.getByRole('button', { name: '태그 상세 열기' }))

    // then
    expect(onEdit).toHaveBeenCalled()
  })
})
