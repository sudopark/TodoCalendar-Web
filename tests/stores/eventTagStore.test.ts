import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEventTagStore } from '../../src/stores/eventTagStore'

vi.mock('../../src/firebase', () => ({ auth: {} }))

vi.mock('../../src/api/eventTagApi', () => ({
  eventTagApi: {
    getAllTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}))

vi.mock('../../src/api/settingApi', () => ({
  settingApi: {
    getDefaultTagColors: vi.fn(),
    updateDefaultTagColors: vi.fn(),
  },
}))

describe('eventTagStore — fetchAll', () => {
  beforeEach(() => {
    useEventTagStore.setState({ tags: new Map(), defaultTagColors: null })
    vi.clearAllMocks()
  })

  it('API가 반환한 태그 목록과 디폴트 색상이 스토어에 저장된다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    const { settingApi } = await import('../../src/api/settingApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
      { uuid: 'tag-2', name: 'Personal', color_hex: '#00ff00' },
    ])
    vi.mocked(settingApi.getDefaultTagColors).mockResolvedValue({ default: '#aaaaaa', holiday: '#bbbbbb' })

    await useEventTagStore.getState().fetchAll()

    const state = useEventTagStore.getState()
    expect(state.tags.get('tag-1')?.color_hex).toBe('#ff0000')
    expect(state.tags.get('tag-2')?.color_hex).toBe('#00ff00')
    expect(state.defaultTagColors).toEqual({ default: '#aaaaaa', holiday: '#bbbbbb' })
  })

  it('API 호출이 실패해도 이전에 불러온 태그 상태는 유지된다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    const { settingApi } = await import('../../src/api/settingApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])
    vi.mocked(settingApi.getDefaultTagColors).mockResolvedValue({ default: '#aaaaaa', holiday: '#bbbbbb' })
    await useEventTagStore.getState().fetchAll()

    vi.mocked(eventTagApi.getAllTags).mockRejectedValue(new Error('network'))
    await useEventTagStore.getState().fetchAll().catch(() => {})

    expect(useEventTagStore.getState().tags.get('tag-1')?.color_hex).toBe('#ff0000')
  })
})

describe('eventTagStore — reset', () => {
  it('reset 호출 시 tags/defaultTagColors가 초기 상태로 돌아간다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    const { settingApi } = await import('../../src/api/settingApi')
    vi.mocked(eventTagApi.getAllTags).mockResolvedValue([
      { uuid: 'tag-1', name: 'Work', color_hex: '#ff0000' },
    ])
    vi.mocked(settingApi.getDefaultTagColors).mockResolvedValue({ default: '#123456', holiday: '#abcdef' })
    await useEventTagStore.getState().fetchAll()

    useEventTagStore.getState().reset()

    const state = useEventTagStore.getState()
    expect(state.tags.size).toBe(0)
    expect(state.defaultTagColors).toBeNull()
  })
})

describe('eventTagStore — CRUD', () => {
  beforeEach(() => {
    useEventTagStore.setState({ tags: new Map(), defaultTagColors: null })
    vi.clearAllMocks()
  })

  it('createTag를 호출하면 생성된 태그가 스토어에 추가된다', async () => {
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.createTag).mockResolvedValue({ uuid: 'tag-new', name: '업무', color_hex: '#ff0000' })

    await useEventTagStore.getState().createTag('업무', '#ff0000')

    expect(useEventTagStore.getState().tags.get('tag-new')?.color_hex).toBe('#ff0000')
  })

  it('updateTag를 호출하면 변경된 색상이 스토어에 반영된다', async () => {
    useEventTagStore.setState({ tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]), defaultTagColors: null })
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.updateTag).mockResolvedValue({ uuid: 'tag-1', name: '업무', color_hex: '#0000ff' })

    await useEventTagStore.getState().updateTag('tag-1', { name: '업무', color_hex: '#0000ff' })

    expect(useEventTagStore.getState().tags.get('tag-1')?.color_hex).toBe('#0000ff')
  })

  it('deleteTag를 호출하면 해당 태그가 스토어에서 제거된다', async () => {
    useEventTagStore.setState({ tags: new Map([['tag-1', { uuid: 'tag-1', name: '업무', color_hex: '#ff0000' }]]), defaultTagColors: null })
    const { eventTagApi } = await import('../../src/api/eventTagApi')
    vi.mocked(eventTagApi.deleteTag).mockResolvedValue({ status: 'ok' })

    await useEventTagStore.getState().deleteTag('tag-1')

    expect(useEventTagStore.getState().tags.has('tag-1')).toBe(false)
  })
})

describe('eventTagStore — updateDefaultTagColor', () => {
  beforeEach(() => {
    useEventTagStore.setState({ tags: new Map(), defaultTagColors: { default: '#111111', holiday: '#222222' } })
    vi.clearAllMocks()
  })

  it("'default' kind와 색상을 넘기면 settingApi가 호출되고 응답 색상이 store에 반영된다", async () => {
    const { settingApi } = await import('../../src/api/settingApi')
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue({ default: '#00ff00', holiday: '#222222' })

    await useEventTagStore.getState().updateDefaultTagColor('default', '#00ff00')

    expect(useEventTagStore.getState().defaultTagColors).toEqual({ default: '#00ff00', holiday: '#222222' })
  })

  it("'holiday' kind를 넘기면 holiday 색상만 업데이트된다", async () => {
    const { settingApi } = await import('../../src/api/settingApi')
    vi.mocked(settingApi.updateDefaultTagColors).mockResolvedValue({ default: '#111111', holiday: '#abcdef' })

    await useEventTagStore.getState().updateDefaultTagColor('holiday', '#abcdef')

    expect(useEventTagStore.getState().defaultTagColors).toEqual({ default: '#111111', holiday: '#abcdef' })
  })

  it('API가 실패하면 예외가 전파되고 store 색상은 변경되지 않는다', async () => {
    const { settingApi } = await import('../../src/api/settingApi')
    vi.mocked(settingApi.updateDefaultTagColors).mockRejectedValue(new Error('boom'))

    await expect(useEventTagStore.getState().updateDefaultTagColor('default', '#ff0000')).rejects.toThrow('boom')

    expect(useEventTagStore.getState().defaultTagColors).toEqual({ default: '#111111', holiday: '#222222' })
  })
})
