import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CalendarList from '../../src/components/CalendarList'
import { useEventTagListCache } from '../../src/repositories/caches/eventTagListCache'
import { useTagFilterStore } from '../../src/stores/tagFilterStore'
import type { EventTag } from '../../src/models'
import type { DefaultTagColors } from '../../src/models'

vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockTags: EventTag[] = [
  { uuid: 'tag-1', name: '업무', color_hex: '#3b82f6' },
  { uuid: 'tag-2', name: '개인', color_hex: '#10b981' },
]

const mockDefaultColors: DefaultTagColors = {
  default: '#aaaaaa',
  holiday: '#ff0000',
}

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
    useEventTagListCache.setState({ tags: tagMap, defaultTagColors: mockDefaultColors })
    useTagFilterStore.setState({ hiddenTagIds: new Set() })
  })

  it('태그 목록과 "이벤트 종류" 헤더를 렌더링한다', () => {
    // given / when
    renderCalendarList()

    // then
    expect(screen.getByText('이벤트 종류')).toBeInTheDocument()
    expect(screen.getByText('업무')).toBeInTheDocument()
    expect(screen.getByText('개인')).toBeInTheDocument()
  })

  it('헤더 우측에 태그 관리 진입용 chevron 버튼이 렌더된다', () => {
    // given / when
    renderCalendarList()

    // then
    expect(screen.getByRole('button', { name: /태그 관리/i })).toBeInTheDocument()
  })

  it('기본 태그와 공휴일 태그가 항상 상단에 표시된다', () => {
    // given / when
    renderCalendarList()

    // then
    expect(screen.getByText('기본')).toBeInTheDocument()
    expect(screen.getByText('공휴일')).toBeInTheDocument()
  })

  it('태그가 없어도 기본/공휴일 태그는 표시된다', () => {
    // given: 사용자 태그 없음
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: mockDefaultColors })

    // when
    renderCalendarList()

    // then
    expect(screen.getByText('기본')).toBeInTheDocument()
    expect(screen.getByText('공휴일')).toBeInTheDocument()
  })

  it('기본/공휴일 태그는 사용자 태그보다 먼저 렌더된다', () => {
    // given / when
    renderCalendarList()

    const allTagNames = screen.getAllByText(/기본|공휴일|업무|개인/).map(el => el.textContent)

    // then: 기본, 공휴일이 업무/개인 앞에 온다
    const defaultIdx = allTagNames.indexOf('기본')
    const holidayIdx = allTagNames.indexOf('공휴일')
    const workIdx = allTagNames.indexOf('업무')
    const personalIdx = allTagNames.indexOf('개인')
    expect(defaultIdx).toBeLessThan(workIdx)
    expect(holidayIdx).toBeLessThan(workIdx)
    expect(defaultIdx).toBeLessThan(personalIdx)
    expect(holidayIdx).toBeLessThan(personalIdx)
  })

  it('태그 행 클릭 시 태그가 숨김 상태로 변경된다', () => {
    // given: 태그 모두 보임
    renderCalendarList()

    // when: '업무' 태그 행 클릭
    const tagRow = screen.getByText('업무').closest('.cursor-pointer')!
    fireEvent.click(tagRow)

    // then: 업무 태그가 hiddenTagIds에 포함됨
    expect(useTagFilterStore.getState().hiddenTagIds.has('tag-1')).toBe(true)
    expect(useTagFilterStore.getState().hiddenTagIds.has('tag-2')).toBe(false)
  })

  it('숨긴 태그는 aria-pressed=false 상태로 표시된다', () => {
    // given: tag-2 숨김 상태
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-2']) })

    // when
    renderCalendarList()

    // then: '개인' 태그 버튼이 aria-pressed=false (숨김 상태)
    const personalTagBtn = screen.getByRole('button', { name: '개인' })
    expect(personalTagBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('숨긴 태그 행 클릭 시 태그가 다시 표시된다', () => {
    // given: tag-1 숨김 상태
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })
    renderCalendarList()

    // when: 업무 태그 행 클릭 (숨김→표시)
    const tagRow = screen.getByText('업무').closest('.cursor-pointer')!
    fireEvent.click(tagRow)

    // then: 업무 태그가 hiddenTagIds에서 제거됨
    expect(useTagFilterStore.getState().hiddenTagIds.has('tag-1')).toBe(false)
  })

  it('헤더 chevron 버튼 클릭 시 /settings/editEvent/tags 경로로 이동한다', () => {
    // given / when
    renderCalendarList()
    fireEvent.click(screen.getByRole('button', { name: /태그 관리/i }))

    // then
    expect(mockNavigate.mock.calls[0][0]).toBe('/settings/editEvent/tags')
  })

  it('태그가 없으면 기본/공휴일 태그만 표시한다', () => {
    // given: 태그 없음
    useEventTagListCache.setState({ tags: new Map(), defaultTagColors: mockDefaultColors })

    // when
    renderCalendarList()

    // then
    expect(screen.getByText('이벤트 종류')).toBeInTheDocument()
    expect(screen.queryByText('업무')).not.toBeInTheDocument()
    expect(screen.getByText('기본')).toBeInTheDocument()
    expect(screen.getByText('공휴일')).toBeInTheDocument()
  })

  it('활성 태그는 색상으로 채워진 원형 아이콘을 표시한다', () => {
    // given: 태그 모두 보임
    useTagFilterStore.setState({ hiddenTagIds: new Set() })

    // when
    renderCalendarList()

    // then: 업무 태그 행에서 원형 체크 표시 컨테이너가 존재한다
    const tagRow = screen.getByText('업무').closest('.cursor-pointer')!
    const circleIcon = tagRow.querySelector('.rounded-full')
    expect(circleIcon).toBeInTheDocument()
  })

  it('숨긴 태그는 빈 원(테두리만) 아이콘을 표시한다', () => {
    // given: tag-1 숨김 상태
    useTagFilterStore.setState({ hiddenTagIds: new Set(['tag-1']) })

    // when
    renderCalendarList()

    // then: 숨긴 '업무' 태그 행의 원형 아이콘 내에 체크마크 svg가 없다
    const tagRow = screen.getByText('업무').closest('.cursor-pointer')!
    const circleIcon = tagRow.querySelector('.rounded-full')
    expect(circleIcon).toBeInTheDocument()
    // 숨김 상태 — 내부에 svg 체크마크가 없어야 한다
    expect(circleIcon?.querySelector('svg')).not.toBeInTheDocument()
  })
})
