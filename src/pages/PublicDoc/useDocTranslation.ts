import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { ensureLanguageBundle } from '../../i18n'
import type { DocLanguage } from '../../domain/publicDocs'

/**
 * 문서 화면의 UI 문구를 UI 언어가 아니라 **읽고 있는 문서의 언어**로 낸다. 독자가 언어 토글로
 * 영문을 골랐는데 푸터·에러 문구만 브라우저 언어로 남으면 화면 언어가 섞인다.
 * 해당 언어 번들이 아직 없으면 도착 전까지 UI 언어 문구를 쓴다.
 */
export function useDocTranslation(lang: DocLanguage | undefined): (key: string) => string {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState<string | undefined>(() =>
    lang && i18n.hasResourceBundle(lang, 'translation') ? lang : undefined
  )

  useEffect(() => {
    if (!lang) return
    let cancelled = false
    ensureLanguageBundle(lang)
      .then(() => {
        if (!cancelled) setLoaded(lang)
      })
      .catch(() => {
        // 번들 로드 실패 — UI 언어 문구로 둔다
      })
    return () => {
      cancelled = true
    }
  }, [lang])

  return key => (loaded === lang && lang ? t(key, { lng: lang }) : t(key))
}
