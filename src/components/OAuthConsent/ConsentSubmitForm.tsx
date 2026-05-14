import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  asBaseUrl: string
  challenge: string
  onBeforeSubmit: () => Promise<string> // returns fresh id_token
}

export function ConsentSubmitForm({ asBaseUrl, challenge, onBeforeSubmit }: Props) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [allowValue, setAllowValue] = useState('')
  const [idToken, setIdToken] = useState('')

  async function handleAllow() {
    if (submitting) return
    setSubmitting(true)
    try {
      const token = await onBeforeSubmit()
      setAllowValue('true')
      setIdToken(token)
      // Let React flush the state update, then submit
      queueMicrotask(() => formRef.current?.submit())
    } catch {
      setSubmitting(false)
    }
  }

  function handleDeny() {
    if (submitting) return
    setSubmitting(true)
    setAllowValue('false')
    queueMicrotask(() => formRef.current?.submit())
  }

  return (
    <form
      ref={formRef}
      data-testid="consent-form"
      action={`${asBaseUrl}/v1/oauth/consent/callback`}
      method="post"
      encType="application/x-www-form-urlencoded"
      onSubmit={e => e.preventDefault()}
      className="contents"
    >
      <input type="hidden" name="challenge" value={challenge} onChange={() => {}} />
      <input type="hidden" name="allow" value={allowValue} onChange={() => {}} />
      <input type="hidden" name="id_token" value={idToken} onChange={() => {}} />

      <button
        type="button"
        onClick={handleDeny}
        disabled={submitting}
        className="flex-1 py-3 px-4 rounded-xl border border-line bg-surface text-fg-secondary font-medium hover:bg-surface-sunken active:bg-surface-sunken disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('oauth.consent.deny')}
      </button>
      <button
        type="button"
        onClick={handleAllow}
        disabled={submitting}
        className="flex-1 py-3 px-4 rounded-xl bg-brand text-action-fg font-semibold hover:bg-brand/90 active:bg-brand/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('oauth.consent.allow')}
      </button>
    </form>
  )
}
