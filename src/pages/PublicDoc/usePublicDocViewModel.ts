import { useCallback, useEffect, useState } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import type { DocLanguage, PublicDoc } from '../../domain/publicDocs'

export type PublicDocState =
  | { status: 'loading' }
  | { status: 'loaded'; markdown: string }
  | { status: 'error' }

export function usePublicDocViewModel(doc: PublicDoc, lang: DocLanguage) {
  const { publicDocRepo } = useRepositories()
  const [state, setState] = useState<PublicDocState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    publicDocRepo
      .loadDoc(doc, lang)
      .then(markdown => {
        if (!cancelled) setState({ status: 'loaded', markdown })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [publicDocRepo, doc, lang, attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])

  return { state, sourceUrl: publicDocRepo.sourceUrl(doc, lang), retry }
}
