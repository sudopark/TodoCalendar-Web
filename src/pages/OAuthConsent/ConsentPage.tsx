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
          <div role="status" aria-live="polite" className="flex justify-center py-24">
            <div
              data-testid="consent-loading"
              className="w-10 h-10 border-4 border-action border-t-transparent rounded-full animate-spin"
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
        header={
          <h1 className="text-2xl sm:text-3xl font-semibold text-fg leading-snug">
            {t('oauth.consent.transient_title')}
          </h1>
        }
        body={
          <p role="alert" className="text-sm text-fg-secondary leading-relaxed">
            {t('oauth.consent.transient_error')}
          </p>
        }
        actions={
          <button
            type="button"
            onClick={() => vm.retry?.()}
            className="flex-1 py-3 px-4 rounded-xl bg-action text-action-fg font-semibold hover:bg-action/90 transition-colors"
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
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-fg-tertiary mb-4">
            {t('oauth.consent.title')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-fg leading-snug">
            {t('oauth.consent.subtitle', { clientName: info.clientName })}
          </h1>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-elevated border border-line">
            <span className="text-[10px] uppercase tracking-wider text-fg-tertiary">
              {t('oauth.consent.redirect_label')}
            </span>
            <span className="text-xs font-mono text-fg-secondary break-all">
              {info.redirectUriOrigin}
            </span>
          </div>
        </div>
      }
      body={
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-xs uppercase tracking-wider text-fg-tertiary mb-4">
              {t('oauth.consent.permissions_label')}
            </h2>
            <ScopeList scopes={info.scopes} />
          </section>
          <section className="pt-8 border-t border-line">
            <h2 className="text-xs uppercase tracking-wider text-fg-tertiary mb-2">
              {t('oauth.consent.account_label')}
            </h2>
            <p className="text-sm text-fg">{account?.email ?? account?.uid}</p>
          </section>
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
