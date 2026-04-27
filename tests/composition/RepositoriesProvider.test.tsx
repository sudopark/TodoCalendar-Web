import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { RepositoriesProvider, useRepositories } from '../../src/composition/RepositoriesProvider'

describe('RepositoriesProvider', () => {
  it('Provider 안쪽에서 useRepositories 를 호출하면 주입한 값을 반환한다', () => {
    const fakeRepos = {} as any
    const { result } = renderHook(() => useRepositories(), {
      wrapper: ({ children }) => <RepositoriesProvider value={fakeRepos}>{children}</RepositoriesProvider>,
    })
    expect(result.current).toBe(fakeRepos)
  })

  it('Provider 없이 useRepositories 를 호출하면 명시적으로 에러를 던진다', () => {
    expect(() => renderHook(() => useRepositories())).toThrow(/RepositoriesProvider missing/)
  })
})
