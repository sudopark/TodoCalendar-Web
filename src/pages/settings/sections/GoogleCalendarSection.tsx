import { useTranslation } from 'react-i18next'
import { SettingsSection } from '../SettingsSection'

export function GoogleCalendarSection() {
  const { t } = useTranslation()

  return (
    <SettingsSection title={t('settings.google_calendar')}>
      <p className="text-sm text-[#6b6b6b]">
        {t('settings.google_calendar_coming_soon')}
      </p>
    </SettingsSection>
  )
}
