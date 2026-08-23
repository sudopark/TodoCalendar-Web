import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { findPublicDoc, isDocLanguage, type DocLanguage } from '../../domain/publicDocs'

/** 독자가 고른 언어를 그 문서도 제공하면 그대로 잇는다. 아니면 UI 언어로 재해석하게 둔다. */
function docLinkPath(id: string, lang: DocLanguage | undefined): string {
  const doc = findPublicDoc(id)
  return lang && doc?.languages.includes(lang) ? `/${id}/${lang}` : `/${id}`
}

/**
 * 공개 문서 화면의 유일한 이동 수단. 앱 스토어·OAuth 동의 화면에서 바로 유입된 독자는
 * 자기가 어느 서비스의 문서를 읽고 있는지 모를 수 있어 좌측을 서비스명으로 둔다.
 */
export function PublicDocFooter({ lang }: { lang?: string }) {
  const { t } = useTranslation()
  const docLang = isDocLanguage(lang) ? lang : undefined

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-8 text-sm">
        <Link
          to="/"
          data-testid="public-doc-home-link"
          className="font-medium text-fg-secondary hover:text-fg"
        >
          To-do Calendar
        </Link>
        <div className="flex items-center gap-5 text-fg-tertiary">
          <Link
            to={docLinkPath('privacy', docLang)}
            data-testid="public-doc-privacy-link"
            className="hover:text-fg"
          >
            {t('footer.privacy')}
          </Link>
          <Link
            to={docLinkPath('terms', docLang)}
            data-testid="public-doc-terms-link"
            className="hover:text-fg"
          >
            {t('footer.terms')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
