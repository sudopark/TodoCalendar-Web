import { useTranslation } from 'react-i18next'
import { SettingsSection, settingsInput } from '../SettingsSection'

export function LanguageSection() {
  const { t, i18n } = useTranslation()

  return (
    <SettingsSection title={t('settings.language')}>
      <select
        className={settingsInput}
        value={i18n.language}
        onChange={e => {
          const lang = e.target.value
          i18n.changeLanguage(lang)
          localStorage.setItem('language', lang)
        }}
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
    </SettingsSection>
  )
}
