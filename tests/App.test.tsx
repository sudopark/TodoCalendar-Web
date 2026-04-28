import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../src/App'

// App은 BrowserRouter + AuthGuard를 포함하므로 authStore와 firebase를 모킹
vi.mock('../src/stores/authStore', () => ({
  useAuthStore: () => ({
    account: { uid: 'test-user' },
    loading: false,
  }),
}))

vi.mock('../src/firebase', () => ({ auth: {} }))

vi.mock('../src/api/todoApi', () => ({
  todoApi: {
    getCurrentTodos: async () => [],
    getTodos: async () => [],
    getUncompletedTodos: async () => [],
  },
}))

vi.mock('../src/api/scheduleApi', () => ({
  scheduleApi: { getSchedules: async () => [] },
}))

vi.mock('../src/api/foremostApi', () => ({
  foremostApi: { getForemostEvent: async () => null },
}))

vi.mock('../src/api/holidayApi', () => ({
  holidayApi: { getHolidays: async () => [] },
}))

vi.mock('../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: async () => [] },
}))

test('로그인된 사용자에게 달력이 표시된다', async () => {
  render(<App />)
  const cells = await screen.findAllByTestId('day-cell', {}, { timeout: 3000 })
  expect(cells.length).toBeGreaterThan(0)
})
