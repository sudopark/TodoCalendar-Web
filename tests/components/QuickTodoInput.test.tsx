import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QuickTodoInput } from '../../src/components/QuickTodoInput'
import { useCurrentTodosStore } from '../../src/stores/currentTodosStore'

vi.mock('../../src/api/todoApi', () => ({
  todoApi: { createTodo: vi.fn() },
}))

vi.mock('../../src/firebase', () => ({
  auth: {},
  db: {},
}))

function renderComponent() {
  return render(
    <MemoryRouter>
      <QuickTodoInput />
    </MemoryRouter>
  )
}

describe('QuickTodoInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCurrentTodosStore.setState({ todos: [] })
  })

  it('placeholder와 함께 입력 필드를 렌더링한다', () => {
    renderComponent()

    expect(screen.getByPlaceholderText('할 일 추가...')).toBeInTheDocument()
  })

  it('Enter 키를 누르면 입력한 이름으로 Todo가 생성되고 입력창이 초기화된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    const newTodo = { uuid: 'new-1', name: '새 할 일', is_current: true, event_time: null }
    vi.mocked(todoApi.createTodo).mockResolvedValue(newTodo as any)

    renderComponent()
    const input = screen.getByPlaceholderText('할 일 추가...')

    // given: 텍스트 입력
    await userEvent.type(input, '새 할 일')

    // when: Enter 키 입력
    await userEvent.keyboard('{Enter}')

    // then: 입력창이 초기화되고 Todo가 스토어에 추가됨
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('')
    })
    expect(useCurrentTodosStore.getState().todos.some(t => t.uuid === 'new-1')).toBe(true)
  })

  it('빈 입력에서 Enter를 눌러도 아무 동작 안 한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')

    renderComponent()
    const input = screen.getByPlaceholderText('할 일 추가...')

    // when: 빈 상태에서 Enter
    await userEvent.click(input)
    await userEvent.keyboard('{Enter}')

    // then: API 호출 없음, 스토어 변화 없음
    await waitFor(() => {
      expect(useCurrentTodosStore.getState().todos).toHaveLength(0)
    })
    // 스토어에 todo가 추가되지 않은 것으로 동작 안 했음을 확인
  })

  it('공백만 있는 입력에서 Enter를 눌러도 아무 동작 안 한다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')

    renderComponent()
    const input = screen.getByPlaceholderText('할 일 추가...')

    await userEvent.type(input, '   ')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(useCurrentTodosStore.getState().todos).toHaveLength(0)
    })
    // 스토어에 todo가 추가되지 않은 것으로 동작 안 했음을 확인
  })

  it('API 실패 시 입력이 유지된다', async () => {
    const { todoApi } = await import('../../src/api/todoApi')
    vi.mocked(todoApi.createTodo).mockRejectedValue(new Error('서버 오류'))

    renderComponent()
    const input = screen.getByPlaceholderText('할 일 추가...')

    await userEvent.type(input, '실패 할 일')
    await userEvent.keyboard('{Enter}')

    // then: 입력값이 유지됨
    await waitFor(() => {
      expect((input as HTMLInputElement).disabled).toBe(false)
    })
    expect((input as HTMLInputElement).value).toBe('실패 할 일')
  })
})
