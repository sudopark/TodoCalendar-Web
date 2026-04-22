import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TagManagementPage } from '../../../src/pages/tagManagement/TagManagementPage'
import { useEventTagStore } from '../../../src/stores/eventTagStore'
import { useTagFilterStore } from '../../../src/stores/tagFilterStore'

vi.mock('../../../src/firebase', () => ({ auth: {} }))

vi.mock('../../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn().mockResolvedValue([
      { uuid: 'tag-a', name: 'Work', color_hex: '#ff0000' },
      { uuid: 'tag-b', name: 'Personal', color_hex: '#00ff00' },
    ]),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deleteTagAndEvents: vi.fn(),
  },
}))

vi.mock('../../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn().mockResolvedValue({ default: '#4A90D9', holiday: '#ef4444' }),
    updateDefaultTagColors: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(<MemoryRouter><TagManagementPage /></MemoryRouter>)
}

describe('TagManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventTagStore.setState({ tags: new Map(), defaultTagColors: null })
    localStorage.clear()
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('마운트되면 fetchAll이 호출되고 Default/Holiday/유저 태그가 순서대로 렌더된다', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    const names = screen.getAllByText(/^(기본|공휴일|Work|Personal)$/).map(e => e.textContent)
    expect(names).toEqual(['기본', '공휴일', 'Work', 'Personal'])
  })

  it('닫기 버튼을 누르면 navigate(-1)이 호출된다', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /태그 관리 닫기|Close tag manager/ }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('"+" 버튼을 누르면 TagEditPanel이 create 모드로 열린다', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /새 태그 추가|Add new tag/ }))

    expect(screen.getByRole('heading', { name: /새 태그|New Tag/ })).toBeInTheDocument()
  })

  it('유저 태그 행의 info 버튼을 누르면 편집 패널이 열리고 이름 input에 기존 이름이 채워진다', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    const infoButtons = screen.getAllByRole('button', { name: /태그 상세 열기|Open tag detail/ })
    // 순서: [Default, Holiday, Work, Personal] → index 2가 Work
    await user.click(infoButtons[2])

    expect(screen.getByRole('heading', { name: /태그 편집|Edit Tag/ })).toBeInTheDocument()
    expect(screen.getByLabelText(/이름|Name/)).toHaveValue('Work')
  })

  it('기본 태그(default) 행의 info 버튼을 누르면 이름이 readonly인 편집 패널이 열린다', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    const infoButtons = screen.getAllByRole('button', { name: /태그 상세 열기|Open tag detail/ })
    await user.click(infoButtons[0]) // Default row

    const nameInput = screen.getByLabelText(/이름|Name/)
    expect(nameInput).toHaveAttribute('readonly')
    expect(nameInput).toHaveValue('기본')
  })
})
