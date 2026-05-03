import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagManagementPanel } from '../../../../src/pages/settings/tagManagement/TagManagementPanel'
import { useEventTagListCache } from '../../../../src/repositories/caches/eventTagListCache'
import { useTagFilterStore } from '../../../../src/stores/tagFilterStore'
import { RepositoriesProvider } from '../../../../src/composition/RepositoriesProvider'
import { TagRepository } from '../../../../src/repositories/TagRepository'
import type { Repositories } from '../../../../src/composition/container'

vi.mock('../../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

vi.mock('../../../../src/api/eventTagApi', () => ({
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

vi.mock('../../../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn().mockResolvedValue({ default: '#4A90D9', holiday: '#ef4444' }),
    updateDefaultTagColors: vi.fn(),
  },
}))

async function makeFakeRepos(): Promise<Repositories> {
  const { eventTagApi } = await import('../../../../src/api/eventTagApi')
  const { settingApi } = await import('../../../../src/api/settingApi')
  return {
    tagRepo: new TagRepository({ eventTagApi, settingApi }),
    eventRepo: {} as unknown as Repositories['eventRepo'],
    eventDetailRepo: {} as unknown as Repositories['eventDetailRepo'],
    holidayRepo: {} as unknown as Repositories['holidayRepo'],
    doneTodoRepo: {} as unknown as Repositories['doneTodoRepo'],
    foremostEventRepo: {} as unknown as Repositories['foremostEventRepo'],
    authRepo: {} as unknown as Repositories['authRepo'],
    settingsRepo: {} as unknown as Repositories['settingsRepo'],
  }
}

function renderPanel(onClose = vi.fn(), repos: Repositories) {
  return render(
    <RepositoriesProvider value={repos}>
      <TagManagementPanel onClose={onClose} />
    </RepositoriesProvider>,
  )
}

describe('TagManagementPanel', () => {
  let repos: Repositories

  beforeEach(async () => {
    vi.clearAllMocks()
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: null })
    localStorage.clear()
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
    repos = await makeFakeRepos()
  })

  it('마운트 시 fetchAll이 실행되고 Default → Holiday → custom 태그 순서로 렌더된다', async () => {
    // given / when
    renderPanel(vi.fn(), repos)

    // then: 로드 완료 후 모든 태그 이름이 순서대로 보임
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    const list = screen.getByTestId('tag-row-list')
    const tagNames = Array.from(list.querySelectorAll('span')).map(el => el.textContent)
    expect(tagNames).toEqual(['기본', '공휴일', 'Work', 'Personal'])
  })

  it('닫기(ChevronLeft) 버튼을 클릭하면 onClose 콜백이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel(onClose, repos)
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    // when
    await user.click(screen.getByRole('button', { name: '태그 관리 닫기' }))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('"+" 버튼을 클릭하면 create 모드 편집 패널("새 태그" 제목)이 렌더된다', async () => {
    // given
    const user = userEvent.setup()
    renderPanel(vi.fn(), repos)
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    // when
    await user.click(screen.getByRole('button', { name: '새 태그 추가' }))

    // then: 리스트 대신 편집 패널이 보임
    expect(screen.getByRole('heading', { name: '새 태그' })).toBeInTheDocument()
    expect(screen.queryByTestId('tag-row-list')).not.toBeInTheDocument()
  })

  it('custom 태그의 편집 버튼을 클릭하면 edit 모드로 전환되고 이름 input에 기존 이름이 채워진다', async () => {
    // given
    const user = userEvent.setup()
    renderPanel(vi.fn(), repos)
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    // when: Work(index 2) 행의 "태그 상세 열기" 버튼 클릭
    const editButtons = screen.getAllByRole('button', { name: '태그 상세 열기' })
    // 순서: 기본(0) / 공휴일(1) / Work(2) / Personal(3)
    await user.click(editButtons[2])

    // then
    expect(screen.getByRole('heading', { name: '태그 편집' })).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('Work')
  })

  it('default 태그의 편집 버튼을 클릭하면 이름 input이 readonly인 편집 패널이 열린다', async () => {
    // given
    const user = userEvent.setup()
    renderPanel(vi.fn(), repos)
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())

    // when: 기본 태그(index 0) 편집 버튼 클릭
    const editButtons = screen.getAllByRole('button', { name: '태그 상세 열기' })
    await user.click(editButtons[0])

    // then
    const nameInput = screen.getByLabelText('이름')
    expect(nameInput).toHaveAttribute('readonly')
    expect(nameInput).toHaveValue('기본')
  })

  it('편집 패널에서 뒤로가기(ChevronLeft)를 클릭하면 다시 리스트 화면("이벤트 종류" 헤더)이 보인다', async () => {
    // given: create 모드 진입
    const user = userEvent.setup()
    renderPanel(vi.fn(), repos)
    await waitFor(() => expect(screen.getByText('Work')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '새 태그 추가' }))
    expect(screen.getByRole('heading', { name: '새 태그' })).toBeInTheDocument()

    // when: 뒤로가기 버튼
    await user.click(screen.getByRole('button', { name: '패널 닫기' }))

    // then: 리스트 헤더 복귀
    expect(screen.getByRole('heading', { name: '이벤트 종류' })).toBeInTheDocument()
    expect(screen.getByTestId('tag-row-list')).toBeInTheDocument()
  })
})
