import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagRow } from '../../../src/pages/tagManagement/components/TagRow'
import { useTagFilterStore } from '../../../src/stores/tagFilterStore'
import type { TagRowModel } from '../../../src/domain/tag/buildTagRows'

const customRow: TagRowModel = { id: 'tag-1', kind: 'custom', name: '업무', color: '#ff0000' }

describe('TagRow', () => {
  beforeEach(() => {
    localStorage.clear()
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('태그 이름이 표시된다', () => {
    render(<TagRow row={customRow} onEdit={() => {}} />)

    expect(screen.getByText('업무')).toBeInTheDocument()
  })

  it('태그가 on 상태이면 체크 채움 아이콘이 보인다', () => {
    render(<TagRow row={customRow} onEdit={() => {}} />)

    expect(screen.getByTestId('tag-row-check-filled')).toBeInTheDocument()
  })

  it('태그가 off 상태(hiddenTagIds에 포함)면 체크 채움 아이콘이 보이지 않는다', () => {
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })

    render(<TagRow row={customRow} onEdit={() => {}} />)

    expect(screen.queryByTestId('tag-row-check-filled')).not.toBeInTheDocument()
  })

  it('체크 영역을 탭하면 tagFilterStore.toggleTag 결과로 상태가 뒤집힌다', async () => {
    const user = userEvent.setup()
    render(<TagRow row={customRow} onEdit={() => {}} />)

    await user.click(screen.getByRole('button', { name: /toggle tag visibility|태그 표시 전환/i }))

    expect(useTagFilterStore.getState().isTagHidden('tag-1')).toBe(true)
  })

  it('info 버튼을 탭하면 onEdit 콜백이 호출된다', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<TagRow row={customRow} onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: /open tag detail|태그 상세 열기/i }))

    expect(onEdit).toHaveBeenCalled()
  })

  it('kind=default 태그도 onEdit 콜백이 호출된다 (읽기 전용 편집 모드용)', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const defaultRow: TagRowModel = { id: 'default', kind: 'default', name: '기본', color: '#1111aa' }
    render(<TagRow row={defaultRow} onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: /open tag detail|태그 상세 열기/i }))

    expect(onEdit).toHaveBeenCalled()
  })
})
