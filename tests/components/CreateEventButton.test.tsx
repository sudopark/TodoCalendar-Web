import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateEventButton } from '../../src/components/CreateEventButton'
import { useEventFormStore } from '../../src/stores/eventFormStore'

vi.mock('../../src/firebase', () => ({
  auth: {},
  db: {},
}))

describe('CreateEventButton', () => {
  beforeEach(() => {
    useEventFormStore.getState().closeForm()
  })

  it('새 이벤트 버튼을 렌더링한다', () => {
    render(<CreateEventButton />)

    expect(screen.getByRole('button', { name: '새 이벤트' })).toBeInTheDocument()
  })

  it('클릭 후 Todo를 선택하면 todo 타입으로 폼이 열린다', async () => {
    render(<CreateEventButton />)

    // when: 버튼 클릭 → 드롭다운 표시 → Todo 선택
    await userEvent.click(screen.getByRole('button', { name: '새 이벤트' }))
    await userEvent.click(screen.getByText('Todo'))

    // then: eventFormStore가 열리고 eventType이 todo
    expect(useEventFormStore.getState().isOpen).toBe(true)
    expect(useEventFormStore.getState().eventType).toBe('todo')
  })
})
