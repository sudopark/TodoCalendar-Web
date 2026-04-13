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

  it('클릭하면 eventFormStore.openForm이 호출되어 폼이 열린다', async () => {
    render(<CreateEventButton />)

    // when: 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '새 이벤트' }))

    // then: eventFormStore의 isOpen이 true가 됨
    expect(useEventFormStore.getState().isOpen).toBe(true)
  })
})
