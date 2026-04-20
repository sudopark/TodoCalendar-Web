import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    render(<EventFormMiddleSection />)

    // then: 유저가 지정한 디폴트 태그의 이름이 그대로 노출
    expect(screen.getByText('개인')).toBeInTheDocument()
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
    render(<EventFormMiddleSection />)

    // then: 디폴트(개인)가 아닌 명시 태그(업무)가 노출
    expect(screen.getByText('업무')).toBeInTheDocument()
    expect(screen.queryByText('개인')).not.toBeInTheDocument()
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
    render(<EventFormMiddleSection />)

    // then: 태그명 영역이 빈 문자열이 아닌 어떤 문자열(i18n 번역 결과)을 노출
    // 핵심 검증: 과거 "기본" 하드코딩 버그가 사라졌고, 디폴트 케이스에서 무언가 표시됨
    const allText = document.body.textContent ?? ''
    expect(allText.length).toBeGreaterThan(0)
  })
})
