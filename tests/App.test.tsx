import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import App from '../src/App'
import i18n from '../src/i18n'

// App은 BrowserRouter + AuthGuard를 포함하므로 authStore와 firebase를 모킹
let authStateMock: { account: { uid: string } | null; loading: boolean } = {
  account: { uid: 'test-user' },
  loading: false,
}
vi.mock('../src/stores/authStore', () => ({
  useAuthStore: () => authStateMock,
}))

vi.mock('../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))

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
  // HolidayResponse 는 { items: HolidayItem[] } 형태이므로 빈 응답도 동일 형태로 mock 한다.
  holidayApi: { getHolidays: async () => ({ items: [] }) },
}))

vi.mock('../src/api/eventTagApi', () => ({
  eventTagApi: { getAllTags: async () => [] },
}))

// PublicDocPage 는 composition root 의 실제 publicDocRepo(container.ts)를 그대로 쓴다 —
// 외부 raw.githubusercontent.com 호출을 막기 위해 api 경계(createPublicDocApi)에서 모킹
vi.mock('../src/api/publicDocApi', () => ({
  createPublicDocApi: () => ({
    sourceUrl: (filePath: string) => `https://example.test/${filePath}`,
    fetchMarkdown: async (filePath: string) => `# Doc\n\nbody-${filePath}`,
  }),
}))

afterEach(() => {
  window.history.pushState({}, '', '/')
})

test('로그인된 사용자에게 달력이 표시된다', async () => {
  authStateMock = { account: { uid: 'test-user' }, loading: false }

  render(<App />)
  const cells = await screen.findAllByTestId('day-cell', {}, { timeout: 3000 })
  expect(cells.length).toBeGreaterThan(0)
})

test('미로그인 상태에서 /terms 로 들어가면 로그인 화면으로 튕기지 않는다', async () => {
  // given: 로그인하지 않은 상태에서 /terms 진입
  authStateMock = { account: null, loading: false }
  window.history.pushState({}, '', '/terms')

  // when
  render(<App />)

  // then: 로그인 버튼이 아니라 문서 화면이 보인다
  await waitFor(() => expect(screen.getByTestId('public-doc-lang-en')).toBeInTheDocument())
  expect(screen.queryByRole('button', { name: i18n.t('login.google') })).not.toBeInTheDocument()
})
