import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CreateEventButton } from '../../src/components/CreateEventButton'

vi.mock('../../src/firebase', () => ({
  auth: {},
  db: {},
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderComponent() {
  return render(
    <MemoryRouter>
      <CreateEventButton />
    </MemoryRouter>
  )
}

describe('CreateEventButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('새 이벤트 버튼을 렌더링한다', () => {
    renderComponent()

    expect(screen.getByRole('button', { name: '새 이벤트' })).toBeInTheDocument()
  })

  it('클릭하면 TypeSelectorPopup이 표시된다', async () => {
    renderComponent()

    // when: 버튼 클릭
    await userEvent.click(screen.getByRole('button', { name: '새 이벤트' }))

    // then: Todo / Schedule 선택 팝업 표시
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
  })

  it('Todo를 선택하면 /todos/new로 이동한다', async () => {
    renderComponent()

    await userEvent.click(screen.getByRole('button', { name: '새 이벤트' }))
    await userEvent.click(screen.getByText('Todo'))

    expect(mockNavigate.mock.calls[0][0]).toBe('/todos/new')
  })

  it('Schedule을 선택하면 /schedules/new로 이동한다', async () => {
    renderComponent()

    await userEvent.click(screen.getByRole('button', { name: '새 이벤트' }))
    await userEvent.click(screen.getByText('Schedule'))

    expect(mockNavigate.mock.calls[0][0]).toBe('/schedules/new')
  })
})
