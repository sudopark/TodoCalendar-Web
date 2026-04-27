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

export function useRepositories(): Repositories {
  const v = useContext(RepositoriesContext)
  if (!v) throw new Error('RepositoriesProvider missing')
  return v
}
