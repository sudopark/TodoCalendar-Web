import { createContext, useContext, type ReactNode } from 'react'
import { repositories as defaultRepositories, type Repositories } from './container'

const RepositoriesContext = createContext<Repositories | null>(null)

interface ProviderProps {
  value?: Repositories
  children: ReactNode
}

export function RepositoriesProvider({ value = defaultRepositories, children }: ProviderProps) {
  return <RepositoriesContext.Provider value={value}>{children}</RepositoriesContext.Provider>
}

// Provider 와 consumer hook 을 같은 파일에 두는 것은 의도된 패턴이다.
// React-refresh 는 이 조합을 경고하지만, plan 컨벤션 상 묶어서 노출한다.
// eslint-disable-next-line react-refresh/only-export-components
export function useRepositories(): Repositories {
  const v = useContext(RepositoriesContext)
  if (!v) throw new Error('RepositoriesProvider missing')
  return v
}
