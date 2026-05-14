import { useTranslation } from 'react-i18next'
import { Eye, Edit3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { resolveScopeI18nKey } from '../../constants/oauthScopeCatalog'

interface Props {
  scopes: string[]
}

const SCOPE_ICONS: Record<string, LucideIcon> = {
  'read:calendar': Eye,
  'write:calendar': Edit3,
}

export function ScopeList({ scopes }: Props) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-3">
      {scopes.map(code => {
        const key = resolveScopeI18nKey(code)
        const Icon = SCOPE_ICONS[code]
        if (!key) {
          console.warn(`[OAuthConsent] Unknown scope code: ${code}`)
          return (
            <li key={code} className="flex items-start gap-3 text-sm text-fg">
              <span className="w-5 h-5 rounded bg-surface-sunken flex-shrink-0 mt-0.5" aria-hidden />
              <span>{t('oauth.consent.scope_unknown', { code })}</span>
            </li>
          )
        }
        return (
          <li key={code} className="flex items-start gap-3 text-sm text-fg">
            {Icon ? (
              <Icon className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" aria-hidden />
            ) : (
              <span className="w-5 h-5 rounded bg-surface-sunken flex-shrink-0 mt-0.5" aria-hidden />
            )}
            <span>{t(key)}</span>
          </li>
        )
      })}
    </ul>
  )
}
