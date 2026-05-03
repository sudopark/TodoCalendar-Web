import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagEditPanel } from '../../../../src/pages/settings/tagManagement/TagEditPanel'
import { useEventTagListCache } from '../../../../src/repositories/caches/eventTagListCache'
import { useToastStore } from '../../../../src/stores/toastStore'
import { RepositoriesProvider } from '../../../../src/composition/RepositoriesProvider'
import { TagRepository } from '../../../../src/repositories/TagRepository'
import type { Repositories } from '../../../../src/composition/container'
import type { TagRowModel } from '../../../../src/domain/tag/buildTagRows'

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
    getAllTags: vi.fn().mockResolvedValue([]),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deleteTagAndEvents: vi.fn(),
  },
}))

vi.mock('../../../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn(),
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

function renderPanel(
  mode: Parameters<typeof TagEditPanel>[0]['mode'],
  onBack: () => void,
  repos: Repositories,
) {
  return render(
    <RepositoriesProvider value={repos}>
      <TagEditPanel mode={mode} onBack={onBack} />
    </RepositoriesProvider>,
  )
}

const customRow: TagRowModel = { id: 'tag-1', kind: 'custom', name: '업무', color: '#ff0000' }
const defaultRow: TagRowModel = { id: 'default', kind: 'default', name: '기본', color: '#4A90D9' }
const holidayRow: TagRowModel = { id: 'holiday', kind: 'holiday', name: '공휴일', color: '#ef4444' }

// ── create 모드 ─────────────────────────────────────────────────────────────

describe('TagEditPanel — create 모드', () => {
  let repos: Repositories

  beforeEach(async () => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: { default: '#111', holiday: '#222' } })
    useToastStore.setState({ toasts: [] })
    vi.clearAllMocks()
    repos = await makeFakeRepos()
  })

  it('빈 이름 input, "새 태그" 제목, 색상 팔레트가 렌더되고 삭제 버튼은 없다', () => {
    // given / when
    renderPanel({ kind: 'create' }, vi.fn(), repos)

    // then
    expect(screen.getByRole('heading', { name: '새 태그' })).toBeInTheDocument()
    const nameInput = screen.getByLabelText('이름')
    expect(nameInput).toHaveValue('')
    expect(nameInput).not.toHaveAttribute('readonly')
    // 팔레트 버튼 8개 존재
    expect(screen.getAllByRole('button', { name: /색상 선택|common\.select_color/ }).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('이름이 비어 있으면 저장 버튼을 눌러도 onBack이 호출되지 않는다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderPanel({ kind: 'create' }, onBack, repos)

    // when: 이름 비운 채 저장
    await user.click(screen.getByRole('button', { name: '저장' }))

    // then
    expect(onBack).not.toHaveBeenCalled()
  })

  it('이름 입력 후 저장하면 캐시에 새 태그가 추가되고 onBack이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { eventTagApi } = await import('../../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockResolvedValue({ uuid: 'new-id', name: '신규', color_hex: '#22c55e' })
    renderPanel({ kind: 'create' }, onBack, repos)

    // when
    await user.type(screen.getByLabelText('이름'), '신규')
    await user.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => expect(useEventTagListCache.getState().tags.get('new-id')?.name).toBe('신규'))
    expect(onBack).toHaveBeenCalled()
  })

  it('저장 실패 시 토스트가 노출되고 onBack은 호출되지 않는다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { eventTagApi } = await import('../../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockRejectedValue(new Error('network error'))
    renderPanel({ kind: 'create' }, onBack, repos)

    // when
    await user.type(screen.getByLabelText('이름'), '에러태그')
    await user.click(screen.getByRole('button', { name: '저장' }))

    // then: 토스트 큐에 에러 항목이 추가됨
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some(t => t.type === 'error')).toBe(true),
    )
    expect(onBack).not.toHaveBeenCalled()
  })
})

// ── edit(custom) 모드 ────────────────────────────────────────────────────────

describe('TagEditPanel — edit(custom) 모드', () => {
  let repos: Repositories

  beforeEach(async () => {
    useEventTagListCache.setState({
      tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]),
      defaultTagColors: { default: '#111', holiday: '#222' },
    })
    useToastStore.setState({ toasts: [] })
    vi.clearAllMocks()
    repos = await makeFakeRepos()
  })

  it('"태그 편집" 제목, 이름 input(편집 가능), 삭제 버튼이 모두 렌더된다', () => {
    // given / when
    renderPanel({ kind: 'edit', row: customRow }, vi.fn(), repos)

    // then
    expect(screen.getByRole('heading', { name: '태그 편집' })).toBeInTheDocument()
    const nameInput = screen.getByLabelText('이름')
    expect(nameInput).toHaveValue('업무')
    expect(nameInput).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it('이름 변경 후 저장하면 캐시가 갱신되고 onBack이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { eventTagApi } = await import('../../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.updateTag).mockResolvedValue({ uuid: 'tag-1', name: '새이름', color_hex: '#22c55e' })
    renderPanel({ kind: 'edit', row: customRow }, onBack, repos)

    // when
    const nameInput = screen.getByLabelText('이름')
    await user.clear(nameInput)
    await user.type(nameInput, '새이름')
    await user.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() => expect(useEventTagListCache.getState().tags.get('tag-1')?.name).toBe('새이름'))
    expect(onBack).toHaveBeenCalled()
  })

  it('삭제 버튼 클릭 → DeleteTagDialog가 열린다', async () => {
    // given
    const user = userEvent.setup()
    renderPanel({ kind: 'edit', row: customRow }, vi.fn(), repos)

    // when
    await user.click(screen.getByRole('button', { name: '삭제' }))

    // then: 다이얼로그의 두 삭제 옵션이 보임
    expect(screen.getByRole('button', { name: '태그만 삭제' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' })).toBeInTheDocument()
  })

  it('삭제 다이얼로그 → "태그만 삭제" → 캐시에서 태그 제거 후 onBack이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { eventTagApi } = await import('../../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.deleteTag).mockResolvedValue({ status: 'ok' })
    renderPanel({ kind: 'edit', row: customRow }, onBack, repos)
    await user.click(screen.getByRole('button', { name: '삭제' }))

    // when
    await user.click(screen.getByRole('button', { name: '태그만 삭제' }))

    // then: 캐시에서 제거됨
    await waitFor(() => expect(useEventTagListCache.getState().tags.has('tag-1')).toBe(false))
    expect(onBack).toHaveBeenCalled()
  })

  it('삭제 다이얼로그 → "태그+이벤트 삭제" → 캐시에서 태그 제거 후 onBack이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { eventTagApi } = await import('../../../../src/api/eventTagApi')
    vi.mocked(eventTagApi.deleteTagAndEvents).mockResolvedValue({ status: 'ok' })
    renderPanel({ kind: 'edit', row: customRow }, onBack, repos)
    await user.click(screen.getByRole('button', { name: '삭제' }))

    // when
    await user.click(screen.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' }))

    // then
    await waitFor(() => expect(useEventTagListCache.getState().tags.has('tag-1')).toBe(false))
    expect(onBack).toHaveBeenCalled()
  })

  it('삭제 다이얼로그 → "취소" → 다이얼로그가 닫히고 편집 패널이 유지된다', async () => {
    // given
    const user = userEvent.setup()
    renderPanel({ kind: 'edit', row: customRow }, vi.fn(), repos)
    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(screen.getByRole('button', { name: '태그만 삭제' })).toBeInTheDocument()

    // when
    await user.click(screen.getByRole('button', { name: '취소' }))

    // then: 다이얼로그 닫힘, 편집 패널("태그 편집" 제목) 유지
    expect(screen.queryByRole('button', { name: '태그만 삭제' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '태그 편집' })).toBeInTheDocument()
  })
})

// ── edit(default) 모드 ───────────────────────────────────────────────────────

describe('TagEditPanel — edit(default) 모드', () => {
  let repos: Repositories

  beforeEach(async () => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: { default: '#4A90D9', holiday: '#ef4444' } })
    useToastStore.setState({ toasts: [] })
    vi.clearAllMocks()
    repos = await makeFakeRepos()
  })

  it('이름 input이 readonly이고, readonly 안내문이 표시되며, 삭제 버튼이 없다', () => {
    // given / when
    renderPanel({ kind: 'edit', row: defaultRow }, vi.fn(), repos)

    // then
    const nameInput = screen.getByLabelText('이름')
    expect(nameInput).toHaveAttribute('readonly')
    expect(nameInput).toHaveValue('기본')
    expect(screen.getByText('기본 태그 이름은 변경할 수 없습니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('색상 변경 후 저장하면 기본 색상이 갱신되고 onBack이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { settingApi } = await import('../../../../src/api/settingApi')
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue({ default: '#22c55e', holiday: '#ef4444' })
    renderPanel({ kind: 'edit', row: defaultRow }, onBack, repos)

    // when: 두 번째 색상 팔레트 버튼(#22c55e) 선택 후 저장
    await user.click(screen.getByRole('button', { name: /(?:색상 선택|Select color):\s*#22c55e/ }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    // then: 캐시의 default 색상이 갱신됨
    await waitFor(() =>
      expect(useEventTagListCache.getState().defaultTagColors?.default).toBe('#22c55e'),
    )
    expect(onBack).toHaveBeenCalled()
  })
})

// ── edit(holiday) 모드 ───────────────────────────────────────────────────────

describe('TagEditPanel — edit(holiday) 모드', () => {
  let repos: Repositories

  beforeEach(async () => {
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: { default: '#4A90D9', holiday: '#ef4444' } })
    useToastStore.setState({ toasts: [] })
    vi.clearAllMocks()
    repos = await makeFakeRepos()
  })

  it('holiday 태그도 이름 readonly + 삭제 버튼 없음 조건을 만족한다', () => {
    // given / when
    renderPanel({ kind: 'edit', row: holidayRow }, vi.fn(), repos)

    // then
    const nameInput = screen.getByLabelText('이름')
    expect(nameInput).toHaveAttribute('readonly')
    expect(nameInput).toHaveValue('공휴일')
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('색상 변경 후 저장하면 holiday 색상이 갱신되고 onBack이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onBack = vi.fn()
    const { settingApi } = await import('../../../../src/api/settingApi')
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue({ default: '#4A90D9', holiday: '#22c55e' })
    renderPanel({ kind: 'edit', row: holidayRow }, onBack, repos)

    // when
    await user.click(screen.getByRole('button', { name: /(?:색상 선택|Select color):\s*#22c55e/ }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    // then
    await waitFor(() =>
      expect(useEventTagListCache.getState().defaultTagColors?.holiday).toBe('#22c55e'),
    )
    expect(onBack).toHaveBeenCalled()
  })
})
