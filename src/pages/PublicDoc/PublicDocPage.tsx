import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { MarkdownContent } from '../../components/markdown/MarkdownContent'
import {
  isSupportedDocLanguage,
  resolveDocLanguage,
  type DocLanguage,
  type PublicDoc,
} from '../../domain/publicDocs'
import { usePublicDocViewModel } from './usePublicDocViewModel'

interface Props {
  doc: PublicDoc
}

export function PublicDocPage({ doc }: Props) {
  const { lang } = useParams()

  // 지원하지 않는 언어라도 404 로 막지 않는다 — 심사·외부 유입에서 문서는 반드시 떠야 한다.
  if (!isSupportedDocLanguage(doc, lang)) {
    return <PublicDocLanguageRedirect doc={doc} />
  }
  return <PublicDocView doc={doc} lang={lang} />
}

function PublicDocLanguageRedirect({ doc }: Props) {
  const { i18n } = useTranslation()
  return <Navigate to={`/${doc.id}/${resolveDocLanguage(doc, i18n.language)}`} replace />
}

function PublicDocView({ doc, lang }: { doc: PublicDoc; lang: DocLanguage }) {
  const { t } = useTranslation()
  const { state, sourceUrl, retry } = usePublicDocViewModel(doc, lang)
  const title = doc.titleKey ? t(doc.titleKey) : doc.title

  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm text-fg-secondary hover:text-fg">
            {t('publicDoc.home')}
          </Link>
          {doc.languages.length > 1 && (
            <nav className="flex items-center gap-1" aria-label={t('publicDoc.language.label')}>
              {doc.languages.map(code => (
                <Link
                  key={code}
                  to={`/${doc.id}/${code}`}
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
        {state.status === 'loading' && (
          <div role="status" aria-live="polite" data-testid="public-doc-loading" className="space-y-3">
            <span className="sr-only">{t('publicDoc.loading')}</span>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                aria-hidden="true"
                className="h-4 animate-pulse rounded bg-surface-sunken"
                style={{ width: i % 3 === 2 ? '60%' : '100%' }}
              />
            ))}
          </div>
        )}

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

        {state.status === 'loaded' && <MarkdownContent markdown={state.markdown} lang={lang} />}
      </main>
    </div>
  )
}
