import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { resolveErrorReasonI18nKey } from '../../constants/oauthErrorReasonCatalog'
import { ConsentLayout } from './ConsentLayout'

interface Props {
  reason: string | null
}

export function ConsentErrorView({ reason }: Props) {
  const { t } = useTranslation()
  const messageKey = resolveErrorReasonI18nKey(reason)

  return (
    <ConsentLayout
      header={
        <h1 className="text-2xl sm:text-3xl font-semibold text-fg leading-snug">
          {t('oauth.error.title')}
        </h1>
      }
      body={
        <p role="alert" className="text-sm text-fg-secondary leading-relaxed">
          {t(messageKey)}
        </p>
      }
      actions={
        <Link
          to="/"
          className="flex-1 py-3 px-4 rounded-xl border border-line bg-surface text-fg-secondary font-medium text-center hover:bg-surface-sunken transition-colors"
        >
          {t('oauth.error.go_home')}
        </Link>
      }
    />
  )
}
