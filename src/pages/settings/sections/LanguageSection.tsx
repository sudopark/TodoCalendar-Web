import { useTranslation } from 'react-i18next'
import { SettingsSection, settingsInput } from '../SettingsSection'
import { loadLanguage, storeLanguage } from '../../../i18n'

export function LanguageSection() {
  const { t, i18n } = useTranslation()

  return (
    <SettingsSection title={t('settings.language')}>
      <select
        className={settingsInput}
        value={i18n.language}
        onChange={e => {
          const lang = e.target.value
          loadLanguage(lang)
            .then(() => storeLanguage(lang))
            .catch(() => {
              // 번들 로드 실패 — 현재 언어를 유지하고 저장하지 않는다
            })
        }}
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
    </SettingsSection>
  )
}
