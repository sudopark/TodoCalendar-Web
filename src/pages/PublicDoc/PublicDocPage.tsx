import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { firstHeading } from '../../components/markdown/firstHeading'
import { MarkdownContent } from '../../components/markdown/MarkdownContent'
import {
  isSupportedDocLanguage,
  resolveDocLanguage,
  type DocLanguage,
  type PublicDoc,
} from '../../domain/publicDocs'
import { PublicDocSkeletonBody } from './PublicDocSkeleton'
import { usePublicDocViewModel } from './usePublicDocViewModel'

interface Props {
  doc: PublicDoc
}

/**
 * 제목 id 는 원문 텍스트 그대로라 퍼센트 디코드가 필요하지만, `#100%-free` 처럼 이스케이프가
 * 깨진 앵커에는 decodeURIComponent 가 URIError 를 던진다. 그땐 원문 그대로 찾는다.
 */
function anchorId(hash: string): string {
  const raw = hash.slice(1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** 하위 문서 경로를 붙인 문서 URL. slug 가 없으면 문서 루트(목차)를 가리킨다. */
function docPath(doc: PublicDoc, lang: DocLanguage, page?: string): string {
  return page ? `/${doc.id}/${lang}/${page}` : `/${doc.id}/${lang}`
}

export function PublicDocPage({ doc }: Props) {
  const { lang, page } = useParams()

  // 지원하지 않는 언어라도 404 로 막지 않는다 — 심사·외부 유입에서 문서는 반드시 떠야 한다.
  if (!isSupportedDocLanguage(doc, lang)) {
    return <PublicDocLanguageRedirect doc={doc} page={page} />
  }
  return <PublicDocView doc={doc} lang={lang} page={page} />
}

function PublicDocLanguageRedirect({ doc, page }: Props & { page?: string }) {
  const { i18n } = useTranslation()
  return <Navigate to={docPath(doc, resolveDocLanguage(doc, i18n.language), page)} replace />
}

function PublicDocView({ doc, lang, page }: { doc: PublicDoc; lang: DocLanguage; page?: string }) {
  const { t } = useTranslation()
  const { hash, key } = useLocation()
  const { state, sourceUrl, retry } = usePublicDocViewModel(doc, lang, page)
  const loadedMarkdown = state.status === 'loaded' ? state.markdown : undefined
  const title =
    (loadedMarkdown && firstHeading(loadedMarkdown)) || (doc.titleKey ? t(doc.titleKey) : doc.title)

  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  // 본문이 뜬 뒤에야 앵커 대상이 존재한다 — 문서를 옮겨 다닐 땐 맨 위에서 시작한다.
  useEffect(() => {
    if (loadedMarkdown === undefined) return
    if (!hash) {
      document.documentElement.scrollTop = 0
      return
    }
    document.getElementById(anchorId(hash))?.scrollIntoView?.()
  }, [loadedMarkdown, hash, key])

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm text-fg-secondary hover:text-fg">
            {t('publicDoc.home')}
          </Link>
          {doc.showsLanguageSwitch && doc.languages.length > 1 && (
            <nav className="flex items-center gap-1" aria-label={t('publicDoc.language.label')}>
              {doc.languages.map(code => (
                <Link
                  key={code}
                  to={docPath(doc, code, page)}
                  replace
                  data-testid={`public-doc-lang-${code}`}
                  aria-current={code === lang ? 'true' : undefined}
                  className={
                    code === lang
                      ? 'rounded-lg bg-surface-sunken px-3 py-1.5 text-sm font-medium text-fg'
                      : 'rounded-lg px-3 py-1.5 text-sm text-fg-tertiary hover:text-fg'
                  }
                >
                  {t(`publicDoc.language.${code}`)}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* 문서 제목은 마크다운 본문 첫 h1 이 담당한다. 여기서 h1 을 또 두면 문서에 h1 이 둘이 된다. */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        {state.status === 'loading' && <PublicDocSkeletonBody />}

        {state.status === 'error' && (
          <div role="alert" data-testid="public-doc-error" className="py-12 text-center">
            <p className="text-base font-semibold text-fg">{t('publicDoc.error.title')}</p>
            <p className="mt-2 text-sm text-fg-tertiary">{t('publicDoc.error.description')}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={retry}
                data-testid="public-doc-retry"
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-sunken"
              >
                {t('publicDoc.error.retry')}
              </button>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="public-doc-source-link"
                className="text-sm text-brand underline underline-offset-2"
              >
                {t('publicDoc.error.openSource')}
              </a>
            </div>
          </div>
        )}

        {state.status === 'loaded' && (
          <MarkdownContent markdown={state.markdown} lang={lang} doc={doc} />
        )}
      </main>
    </div>
  )
}
