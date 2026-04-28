import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { TagDropdown } from '../../src/components/TagDropdown'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useEventDefaultsStore } from '../../src/stores/eventDefaultsStore'

vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

function resetStores() {
  useEventTagListCache.setState({ tags: new Map(), defaultTagColors: null })
  useEventDefaultsStore.setState({ defaultTagId: null, defaultNotificationSeconds: null })
}

function LocationCapture({ onLocation }: { onLocation: (l: ReturnType<typeof useLocation>) => void }) {
  const loc = useLocation()
  onLocation(loc)
  return null
}

describe('TagDropdown', () => {
  beforeEach(() => {
    resetStores()
  })

  it('value가 null이면 트리거에 기본 태그 이름이 표시된다', () => {
    // given: 유저 디폴트 태그(개인) 설정
    useEventTagListCache.setState({
      tags: new Map([['tag-p', { uuid: 'tag-p', name: '개인', color_hex: '#123456' }]]),
      defaultTagColors: { default: '#aaa', holiday: '#bbb' },
    })
    useEventDefaultsStore.setState({ defaultTagId: 'tag-p', defaultNotificationSeconds: null })

    // when
    render(
      <MemoryRouter>
        <TagDropdown value={null} onChange={vi.fn()} />
      </MemoryRouter>,
    )

    // then
    expect(screen.getByTestId('tag-dropdown-trigger')).toHaveTextContent('개인')
  })

  it('value가 특정 태그 id면 트리거에 해당 태그 이름이 표시된다', () => {
    useEventTagListCache.setState({
      tags: new Map([
        ['tag-work', { uuid: 'tag-work', name: '업무', color_hex: '#ff0000' }],
        ['tag-p', { uuid: 'tag-p', name: '개인', color_hex: '#123456' }],
      ]),
      defaultTagColors: { default: '#aaa', holiday: '#bbb' },
    })

    render(
      <MemoryRouter>
        <TagDropdown value="tag-work" onChange={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('tag-dropdown-trigger')).toHaveTextContent('업무')
  })

  it('드랍다운을 열고 항목을 선택하면 onChange가 해당 tagId로 호출된다', async () => {
    useEventTagListCache.setState({
      tags: new Map([['tag-work', { uuid: 'tag-work', name: '업무', color_hex: '#ff0000' }]]),
      defaultTagColors: { default: '#aaa', holiday: '#bbb' },
    })
    const onChange = vi.fn()

    render(
      <MemoryRouter>
        <TagDropdown value={null} onChange={onChange} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByTestId('tag-dropdown-trigger'))
    await userEvent.click(await screen.findByText('업무'))

    expect(onChange).toHaveBeenCalledWith('tag-work')
  })

  it('showManageLink가 false 또는 미지정이면 "태그 관리" 링크가 렌더되지 않는다', () => {
    render(
      <MemoryRouter>
        <TagDropdown value={null} onChange={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: /태그 관리/ })).not.toBeInTheDocument()
  })

  it('showManageLink가 true면 "태그 관리" 링크가 렌더된다', () => {
    render(
      <MemoryRouter>
        <TagDropdown value={null} onChange={vi.fn()} showManageLink />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /태그 관리/ })).toBeInTheDocument()
  })

  it('"태그 관리" 링크 클릭 시 /tags로 이동하고 background state가 전달된다', async () => {
    let captured: ReturnType<typeof useLocation> | null = null

    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: null }]}>
        <Routes>
          <Route path="/" element={<TagDropdown value={null} onChange={vi.fn()} showManageLink />} />
          <Route
            path="/tags"
            element={<LocationCapture onLocation={l => { captured = l }} />}
          />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /태그 관리/ }))

    expect(captured?.pathname).toBe('/tags')
    expect((captured?.state as any)?.background?.pathname).toBe('/')
  })
})
