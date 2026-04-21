import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EventDetailsSection } from '../../../src/components/eventForm/EventDetailsSection'

vi.mock('../../../src/stores/eventTagStore', () => ({
  useEventTagStore: (sel: any) => sel({ tags: new Map(), defaultTagColors: null }),
  DEFAULT_TAG_ID: 'default',
  HOLIDAY_TAG_ID: 'holiday',
}))

function defaultProps(overrides: Partial<React.ComponentProps<typeof EventDetailsSection>> = {}) {
  return {
    place: '',
    onPlaceChange: vi.fn(),
    url: '',
    onUrlChange: vi.fn(),
    memo: '',
    onMemoChange: vi.fn(),
    tagId: null,
    onTagChange: vi.fn(),
    notifications: [],
    onNotificationsChange: vi.fn(),
    isAllDay: false,
    fieldPrefix: 'schedule' as const,
    ...overrides,
  }
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('EventDetailsSection', () => {
  it('장소 / URL / 메모 라벨이 입력 필드와 연결되어 렌더된다', () => {
    // given / when
    renderWithRouter(
      <EventDetailsSection {...defaultProps({ place: 'P', url: 'U', memo: 'M' })} />
    )

    // then: getByLabelText가 동작 = label의 htmlFor 연결이 유지됨
    expect(screen.getByLabelText('장소')).toHaveValue('P')
    expect(screen.getByLabelText('URL')).toHaveValue('U')
    expect(screen.getByLabelText('메모')).toHaveValue('M')
  })

  it('알림 섹션의 레이블이 노출된다', () => {
    // given / when
    renderWithRouter(<EventDetailsSection {...defaultProps()} />)

    // then: 시안 정합으로 "태그" 중복 라벨은 제거되었고, 알림 라벨은 유지
    expect(screen.getByText('알림')).toBeInTheDocument()
  })

  it('태그 섹션은 라벨 없이 TagSelector로만 렌더된다', () => {
    // given / when
    renderWithRouter(<EventDetailsSection {...defaultProps()} />)

    // then: TagSelector의 "태그 관리 >" 링크가 존재 = 태그 섹션이 렌더됨
    expect(screen.getByRole('button', { name: /태그 관리/ })).toBeInTheDocument()
  })

  it('장소 입력에 타이핑하면 onPlaceChange가 호출된다', async () => {
    // given
    const onPlaceChange = vi.fn()
    renderWithRouter(<EventDetailsSection {...defaultProps({ onPlaceChange })} />)

    // when
    await userEvent.type(screen.getByLabelText('장소'), 'X')

    // then
    expect(onPlaceChange).toHaveBeenCalled()
  })

  it('fieldPrefix가 다르면 id도 달라져 두 섹션을 한 페이지에 렌더할 수 있다', () => {
    // given / when: 두 섹션을 동시에 렌더
    renderWithRouter(
      <div>
        <EventDetailsSection {...defaultProps({ fieldPrefix: 'schedule' })} />
        <EventDetailsSection {...defaultProps({ fieldPrefix: 'todo' })} />
      </div>
    )

    // then: "장소" 라벨에 연결된 input이 두 개 존재 (id 충돌 없음)
    expect(screen.getAllByLabelText('장소')).toHaveLength(2)
  })
})
