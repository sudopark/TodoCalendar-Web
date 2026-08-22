import { useCallback, useEffect, useState } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { isValidDocPage, type DocLanguage, type PublicDoc } from '../../domain/publicDocs'

export type PublicDocState =
  | { status: 'loading' }
  | { status: 'loaded'; markdown: string }
  | { status: 'error' }

export function usePublicDocViewModel(doc: PublicDoc, lang: DocLanguage, page?: string) {
  const { publicDocRepo } = useRepositories()
  // URL 세그먼트가 그대로 원문 레포 경로에 실리므로, 있을 수 없는 slug 는 요청도 보내지 않는다.
  const unreachablePage = page !== undefined && !isValidDocPage(page)
  const [fetchState, setFetchState] = useState<PublicDocState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (unreachablePage) return
    let cancelled = false
    setFetchState({ status: 'loading' })

    publicDocRepo
      .loadDoc(doc, lang, page)
      .then(markdown => {
        if (!cancelled) setFetchState({ status: 'loaded', markdown })
      })
      .catch(() => {
        if (!cancelled) setFetchState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [publicDocRepo, doc, lang, page, unreachablePage, attempt])

  const retry = useCallback(() => setAttempt(n => n + 1), [])
  const state: PublicDocState = unreachablePage ? { status: 'error' } : fetchState

  // 검증 못 한 slug 로 원문 URL 을 만들면 에러 화면의 원문 링크가 레포 밖을 가리킨다 —
  // 브라우저가 `../` 를 정규화해 다른 저장소로 넘어간다. 이럴 땐 문서 루트를 가리킨다.
  const sourceUrl = publicDocRepo.sourceUrl(doc, lang, unreachablePage ? undefined : page)

  return { state, sourceUrl, retry }
}
