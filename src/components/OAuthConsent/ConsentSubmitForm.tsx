import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  callbackUrl: string
  challenge: string
  onBeforeSubmit: () => Promise<string>
}

export function ConsentSubmitForm({ callbackUrl, challenge, onBeforeSubmit }: Props) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleAllow() {
    if (submitting) return
    const form = formRef.current
    if (!form) return
    setSubmitting(true)
    try {
      const idToken = await onBeforeSubmit()
      ;(form.elements.namedItem('allow') as HTMLInputElement).value = 'true'
      ;(form.elements.namedItem('id_token') as HTMLInputElement).value = idToken
      form.submit()
    } catch {
      setSubmitting(false)
    }
  }

  function handleDeny() {
    if (submitting) return
    const form = formRef.current
    if (!form) return
    setSubmitting(true)
    ;(form.elements.namedItem('allow') as HTMLInputElement).value = 'false'
    form.submit()
  }

  return (
    <form
      ref={formRef}
      data-testid="consent-form"
      action={callbackUrl}
      method="post"
      encType="application/x-www-form-urlencoded"
      onSubmit={e => e.preventDefault()}
      className="contents"
    >
      <input type="hidden" name="challenge" defaultValue={challenge} />
      <input type="hidden" name="allow" defaultValue="" />
      <input type="hidden" name="id_token" defaultValue="" />

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
