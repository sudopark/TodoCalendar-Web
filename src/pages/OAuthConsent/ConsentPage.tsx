import { useEffect } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useConsentViewModel } from './useConsentViewModel'
import { useAuthStore } from '../../stores/authStore'
import { getAuthInstance } from '../../firebase'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { ConsentLayout } from '../../components/OAuthConsent/ConsentLayout'
import { ScopeList } from '../../components/OAuthConsent/ScopeList'
import { ConsentSubmitForm } from '../../components/OAuthConsent/ConsentSubmitForm'

export function ConsentPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const challenge = searchParams.get('challenge') ?? ''
  const location = useLocation()
  const account = useAuthStore(s => s.account)
  const vm = useConsentViewModel(challenge)
  const { oauthConsentCallbackUrl } = useRepositories()

  useEffect(() => {
    document.title = t('oauth.consent.title')
    let meta = document.querySelector('meta[name="robots"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex,nofollow')
  }, [t])

  if (vm.state === 'invalid_query') {
    return <Navigate to="/oauth/consent/error?reason=invalid_challenge" replace />
  }
  if (vm.state === 'redirect_to_login') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (vm.state === 'redirect_to_error') {
    return <Navigate to="/oauth/consent/error?reason=invalid_challenge" replace />
  }
  if (vm.state === 'loading') {
    return (
      <ConsentLayout
        header={null}
        body={
          <div role="status" aria-live="polite" className="flex justify-center py-12">
            <div
              data-testid="consent-loading"
              className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"
            />
          </div>
        }
        actions={null}
      />
    )
  }
  if (vm.state === 'transient_error') {
    return (
      <ConsentLayout
        header={<h1 className="text-xl font-bold text-fg text-center">{t('oauth.consent.title')}</h1>}
        body={
          <p role="alert" className="text-sm text-fg-secondary text-center leading-relaxed">
            {t('oauth.consent.transient_error')}
          </p>
        }
        actions={
          <button
            type="button"
            onClick={() => vm.retry?.()}
            className="flex-1 py-3 px-4 rounded-xl bg-brand text-action-fg font-semibold hover:bg-brand/90 active:bg-brand/80 transition-colors"
          >
            {t('oauth.consent.retry')}
          </button>
        }
      />
    )
  }

  // ready
  const info = vm.clientInfo!
  return (
    <ConsentLayout
      header={
        <div className="text-center">
          <h1 className="text-xl font-bold text-fg">{t('oauth.consent.title')}</h1>
          <p className="text-sm text-fg-secondary mt-2">
            {t('oauth.consent.subtitle', { clientName: info.clientName })}
          </p>
        </div>
      }
      body={
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">
              {t('oauth.consent.redirect_label')}
            </p>
            <p className="text-sm text-fg break-all">{info.redirectUriOrigin}</p>
          </div>
          <div>
            <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">
              {t('oauth.consent.account_label')}
            </p>
            <p className="text-sm text-fg">{account?.email ?? account?.uid}</p>
          </div>
          <div className="pt-2 border-t border-line">
            <ScopeList scopes={info.scopes} />
          </div>
        </div>
      }
      actions={
        <ConsentSubmitForm
          callbackUrl={oauthConsentCallbackUrl}
          challenge={challenge}
          onBeforeSubmit={async () => {
            const user = getAuthInstance().currentUser
            if (!user) throw new Error('No firebase user')
            return user.getIdToken(true)
          }}
        />
      }
    />
  )
}

export default ConsentPage
