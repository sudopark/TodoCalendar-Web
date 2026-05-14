import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ConsentErrorView } from '../../components/OAuthConsent/ConsentErrorView'

export function ConsentErrorPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')

  useEffect(() => {
    document.title = t('oauth.error.title')
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex,nofollow')
  }, [t])

  return <ConsentErrorView reason={reason} />
}

export default ConsentErrorPage
