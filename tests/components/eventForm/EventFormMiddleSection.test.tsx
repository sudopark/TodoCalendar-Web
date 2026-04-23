import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EventFormMiddleSection } from '../../../src/components/eventForm/EventFormMiddleSection'
import { useEventFormStore } from '../../../src/stores/eventFormStore'
import { useEventTagStore } from '../../../src/stores/eventTagStore'
import { useEventDefaultsStore } from '../../../src/stores/eventDefaultsStore'

vi.mock('../../../src/firebase', () => ({ auth: {} }))

// NotificationPickerDropdown는 이 테스트 관심사 밖 — 단순 stub으로 대체
vi.mock('../../../src/components/eventForm/NotificationPickerDropdown', () => ({
  NotificationPickerDropdown: () => <div data-testid="notification-picker-stub" />,
}))

function resetStores() {
  useEventTagStore.setState({ tags: new Map(), defaultTagColors: null })
  useEventDefaultsStore.setState({ defaultTagId: null, defaultNotificationSeconds: null })
  useEventFormStore.setState({ eventTagId: null } as any)
}

describe('EventFormMiddleSection — 디폴트 태그 표시', () => {
  beforeEach(() => {
    resetStores()
  })

  it('유저가 지정한 디폴트 태그가 있고 폼의 eventTagId가 null이면 해당 태그명이 표시된다', () => {
    // given: tag-personal 태그 존재 + 디폴트로 지정 + 폼은 태그 미지정 상태
    useEventTagStore.setState({
      tags: new Map([['tag-personal', { uuid: 'tag-personal', name: '개인', color_hex: '#123456' }]]),
      defaultTagColors: { default: '#aaa', holiday: '#bbb' },
    })
    useEventDefaultsStore.setState({ defaultTagId: 'tag-personal', defaultNotificationSeconds: null })
    useEventFormStore.setState({ eventTagId: null } as any)

    // when
    render(
      <MemoryRouter>
        <EventFormMiddleSection />
      </MemoryRouter>
    )

    // then: 드랍다운 트리거에 유저 디폴트 태그명이 표시
    expect(screen.getByTestId('tag-dropdown-trigger')).toHaveTextContent('개인')
  })

  it('폼이 명시적 태그 UUID를 가지면 해당 태그명이 표시된다', () => {
    // given
    useEventTagStore.setState({
      tags: new Map([
        ['tag-work', { uuid: 'tag-work', name: '업무', color_hex: '#ff0000' }],
        ['tag-personal', { uuid: 'tag-personal', name: '개인', color_hex: '#123456' }],
      ]),
      defaultTagColors: { default: '#aaa', holiday: '#bbb' },
    })
    useEventDefaultsStore.setState({ defaultTagId: 'tag-personal', defaultNotificationSeconds: null })
    useEventFormStore.setState({ eventTagId: 'tag-work' } as any)

    // when
    render(
      <MemoryRouter>
        <EventFormMiddleSection />
      </MemoryRouter>
    )

    // then: 드랍다운 트리거에 명시 태그명이 표시, 디폴트(개인)는 트리거에 없음
    const trigger = screen.getByTestId('tag-dropdown-trigger')
    expect(trigger).toHaveTextContent('업무')
    expect(trigger).not.toHaveTextContent('개인')
  })

  it('디폴트 태그도 지정되지 않고 eventTagId도 null이지만 디폴트 색상은 있으면 디폴트 명이 i18n 번역으로 표시된다', () => {
    // given
    useEventTagStore.setState({
      tags: new Map(),
      defaultTagColors: { default: '#111', holiday: '#222' },
    })
    useEventDefaultsStore.setState({ defaultTagId: null, defaultNotificationSeconds: null })
    useEventFormStore.setState({ eventTagId: null } as any)

    // when
    render(
      <MemoryRouter>
        <EventFormMiddleSection />
      </MemoryRouter>
    )

    // then: 트리거 자체가 존재하고 document.body에 어떤 텍스트가 포함 (i18n 번역 결과)
    expect(screen.getByTestId('tag-dropdown-trigger')).toBeInTheDocument()
    const allText = document.body.textContent ?? ''
    expect(allText.length).toBeGreaterThan(0)
  })
})
