import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-fg-quaternary">404</h1>
      <p className="mt-4 text-lg text-fg-secondary">{t('error.page_not_found')}</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
      >
        {t('error.go_home')}
      </Link>
    </div>
  )
}
