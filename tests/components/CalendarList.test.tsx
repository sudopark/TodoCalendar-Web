import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CalendarList from '../../src/components/CalendarList'
import { useEventTagStore } from '../../src/stores/eventTagStore'
import { useTagFilterStore } from '../../src/stores/tagFilterStore'
import type { EventTag } from '../../src/models'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockTags: EventTag[] = [
  { uuid: 'tag-1', name: '업무', color_hex: '#3b82f6' },
  { uuid: 'tag-2', name: '개인', color_hex: '#10b981' },
]

function renderCalendarList() {
  return render(
    <MemoryRouter>
      <CalendarList />
    </MemoryRouter>
  )
}

describe('CalendarList', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    const tagMap = new Map<string, EventTag>(mockTags.map(t => [t.uuid, t]))
    useEventTagStore.setState({ tags: tagMap })
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('태그 목록과 섹션 헤더를 렌더링한다', () => {
    // given / when
    renderCalendarList()

    // then
    expect(screen.getByText('이벤트 종류')).toBeInTheDocument()
    expect(screen.getByText('업무')).toBeInTheDocument()
    expect(screen.getByText('개인')).toBeInTheDocument()
  })

  it('태그 관리 링크가 렌더된다', () => {
    // given / when
    renderCalendarList()

    // then
    expect(screen.getByRole('button', { name: /태그 관리/i })).toBeInTheDocument()
  })

  it('태그 숨기기 버튼 클릭 시 태그가 숨김 상태로 변경된다', () => {
    // given: 태그 모두 보임
    renderCalendarList()

    // when: '업무' 태그 행 클릭
    const tagRow = screen.getByText('업무').closest('.cursor-pointer')!
    fireEvent.click(tagRow)

    // then: 업무 태그가 hiddenTagIds에 포함됨
    expect(useTagFilterStore.getState().hiddenTagIds.has('tag-1')).toBe(true)
    expect(useTagFilterStore.getState().hiddenTagIds.has('tag-2')).toBe(false)
  })

  it('숨긴 태그는 opacity-50 클래스가 적용된다', () => {
    // given: tag-2 숨김 상태
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-2']) })

    // when
    renderCalendarList()

    // then: '개인' 태그 행에 opacity-50
    const personalTagRow = screen.getByText('개인').closest('.opacity-50')
    expect(personalTagRow).toBeInTheDocument()
  })

  it('숨긴 태그 표시 버튼 클릭 시 태그가 다시 표시된다', () => {
    // given: tag-1 숨김 상태
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })
    renderCalendarList()

    // when: 업무 태그 행 클릭 (숨김→표시)
    const tagRow = screen.getByText('업무').closest('.cursor-pointer')!
    fireEvent.click(tagRow)

    // then: 업무 태그가 hiddenTagIds에서 제거됨
    expect(useTagFilterStore.getState().hiddenTagIds.has('tag-1')).toBe(false)
  })

  it('태그 관리 버튼 클릭 시 /tags 경로로 이동한다', () => {
    // given / when
    renderCalendarList()
    fireEvent.click(screen.getByRole('button', { name: /태그 관리/i }))

    // then
    expect(mockNavigate.mock.calls[0][0]).toBe('/tags')
  })

  it('태그가 없으면 태그 행 없이 헤더만 표시한다', () => {
    // given: 태그 없음
    useEventTagStore.setState({ tags: new Map() })

    // when
    renderCalendarList()

    // then
    expect(screen.getByText('이벤트 종류')).toBeInTheDocument()
    expect(screen.queryByText('업무')).not.toBeInTheDocument()
  })
})
