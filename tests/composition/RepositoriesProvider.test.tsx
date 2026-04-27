import { describe, it, expect, vi } from 'vitest'

// container.ts → EventRepository → 캐시 → todoApi/scheduleApi → Firebase 연쇄 초기화 차단
vi.mock('../../src/api/todoApi', () => ({ todoApi: {} }))
vi.mock('../../src/api/scheduleApi', () => ({ scheduleApi: {} }))

import { renderHook } from '@testing-library/react'
import { RepositoriesProvider, useRepositories } from '../../src/composition/RepositoriesProvider'
import type { Repositories } from '../../src/composition/container'

describe('RepositoriesProvider', () => {
  it('Provider 안쪽에서 useRepositories 를 호출하면 주입한 값을 반환한다', () => {
    const fakeRepos = {} as Repositories
    const { result } = renderHook(() => useRepositories(), {
      wrapper: ({ children }) => <RepositoriesProvider value={fakeRepos}>{children}</RepositoriesProvider>,
    })
    expect(result.current).toBe(fakeRepos)
  })

  it('Provider 없이 useRepositories 를 호출하면 명시적으로 에러를 던진다', () => {
    expect(() => renderHook(() => useRepositories())).toThrow(/RepositoriesProvider missing/)
  })
})
