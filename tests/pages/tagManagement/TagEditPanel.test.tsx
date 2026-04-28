import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagEditPanel } from '../../../src/pages/tagManagement/components/TagEditPanel'
import { useEventTagListCache } from '../../../src/repositories/caches/eventTagListCache'
import type { TagRowModel } from '../../../src/domain/tag/buildTagRows'

vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

vi.mock('../../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn().mockResolvedValue([]),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deleteTagAndEvents: vi.fn(),
  },
}))

vi.mock('../../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn(),
    updateDefaultTagColors: vi.fn(),
  },
}))

const customRow: TagRowModel = { id: 'tag-1', kind: 'custom', name: '업무', color: '#ff0000' }
const defaultRow: TagRowModel = { id: 'default', kind: 'default', name: '기본', color: '#1111aa' }

describe('TagEditPanel — create 모드', () => {
  beforeEach(() => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: { default: '#111', holiday: '#222' } })
    vi.clearAllMocks()
  })

  it('이름 input과 색상 팔레트가 모두 활성화되고 삭제 버튼은 노출되지 않는다', () => {
    render(<TagEditPanel mode={{ kind: 'create' }} onClose={() => {}} />)

    const nameInput = screen.getByLabelText(/이름|Name/)
    expect(nameInput).not.toBeDisabled()
    expect(screen.queryByRole('button', { name: /^삭제$|^Delete$/ })).not.toBeInTheDocument()
  })

  it('이름과 색상을 입력하고 저장하면 createTag API가 호출되고 패널이 닫힌다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { eventTagApi } = await import('../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockResolvedValue({ uuid: 'new-id', name: '신규', color_hex: '#22c55e' })

    render(<TagEditPanel mode={{ kind: 'create' }} onClose={onClose} />)
    await user.type(screen.getByLabelText(/이름|Name/), '신규')
    await user.click(screen.getByTitle('#22c55e'))
    await user.click(screen.getByRole('button', { name: /^저장$|^Save$/ }))

    await waitFor(() => expect(useEventTagListCache.getState().tags.get('new-id')?.name).toBe('신규'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('TagEditPanel — edit(custom) 모드', () => {
  beforeEach(() => {
    useEventTagListCache.setState({
      tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]),
      defaultTagColors: { default: '#111', holiday: '#222' },
    })
    vi.clearAllMocks()
  })

  it('이름 input, 색상 팔레트, 삭제 버튼이 모두 노출된다', () => {
    render(<TagEditPanel mode={{ kind: 'edit', row: customRow }} onClose={() => {}} />)

    expect(screen.getByLabelText(/이름|Name/)).toHaveValue('업무')
    expect(screen.getByRole('button', { name: /^삭제$|^Delete$/ })).toBeInTheDocument()
  })

  it('저장하면 updateTag API가 호출되고 스토어에 반영 후 패널이 닫힌다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { eventTagApi } = await import('../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.updateTag).mockResolvedValue({ uuid: 'tag-1', name: '새이름', color_hex: '#22c55e' })

    render(<TagEditPanel mode={{ kind: 'edit', row: customRow }} onClose={onClose} />)
    const nameInput = screen.getByLabelText(/이름|Name/)
    await user.clear(nameInput)
    await user.type(nameInput, '새이름')
    await user.click(screen.getByTitle('#22c55e'))
    await user.click(screen.getByRole('button', { name: /^저장$|^Save$/ }))

    await waitFor(() => expect(useEventTagListCache.getState().tags.get('tag-1')?.name).toBe('새이름'))
    expect(onClose).toHaveBeenCalled()
  })

  it('삭제 버튼을 누르면 DeleteTagDialog가 열린다', async () => {
    const user = userEvent.setup()
    render(<TagEditPanel mode={{ kind: 'edit', row: customRow }} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /^삭제$|^Delete$/ }))

    expect(screen.getByRole('button', { name: /태그만 삭제|Delete tag only/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /태그 \+ 연관 이벤트|Delete tag and all events/ })).toBeInTheDocument()
  })
})

describe('TagEditPanel — edit(default) 모드', () => {
  beforeEach(() => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: { default: '#111', holiday: '#222' } })
    vi.clearAllMocks()
  })

  it('이름 input이 readonly이고, 색상 팔레트는 활성화, 삭제 버튼은 없다', () => {
    render(<TagEditPanel mode={{ kind: 'edit', row: defaultRow }} onClose={() => {}} />)

    const nameInput = screen.getByLabelText(/이름|Name/)
    expect(nameInput).toHaveAttribute('readonly')
    expect(nameInput).toHaveValue('기본')
    expect(screen.queryByRole('button', { name: /^삭제$|^Delete$/ })).not.toBeInTheDocument()
    expect(screen.getByText(/기본 태그 이름은 변경할 수 없습니다|Default tags cannot be renamed/)).toBeInTheDocument()
  })

  it('색상을 바꾸고 저장하면 updateDefaultTagColor API가 호출되고 패널이 닫힌다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { settingApi } = await import('../../../src/api/settingApi')
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue({ default: '#22c55e', holiday: '#222' })

    render(<TagEditPanel mode={{ kind: 'edit', row: defaultRow }} onClose={onClose} />)
    await user.click(screen.getByTitle('#22c55e'))
    await user.click(screen.getByRole('button', { name: /^저장$|^Save$/ }))

    await waitFor(() => expect(useEventTagListCache.getState().defaultTagColors?.default).toBe('#22c55e'))
    expect(onClose).toHaveBeenCalled()
  })
})
