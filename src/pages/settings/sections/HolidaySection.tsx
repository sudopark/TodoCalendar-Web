import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useHolidayStore, type HolidayCountry } from '../../../stores/holidayStore'
import { SettingsSection, settingsInput } from '../SettingsSection'

export function HolidaySection() {
  const { t } = useTranslation()
  const holidayCountry = useHolidayStore(s => s.country)
  const setHolidayCountry = useHolidayStore(s => s.setCountry)

  const countries = useMemo(() => [
    { label: t('settings.country_kr'), locale: 'ko', region: 'south_korea' },
    { label: t('settings.country_us'), locale: 'en', region: 'united_states' },
    { label: t('settings.country_jp'), locale: 'ja', region: 'japan' },
    { label: t('settings.country_cn'), locale: 'zh', region: 'china' },
    { label: t('settings.country_uk'), locale: 'en', region: 'united_kingdom' },
    { label: t('settings.country_de'), locale: 'de', region: 'germany' },
    { label: t('settings.country_fr'), locale: 'fr', region: 'france' },
  ], [t])

  return (
    <SettingsSection title={t('settings.holiday_country')}>
      <select
        className={settingsInput}
        value={`${holidayCountry.locale}:${holidayCountry.region}`}
        onChange={e => {
          const [locale, region] = e.target.value.split(':')
          setHolidayCountry({ locale, region } as HolidayCountry)
        }}
      >
        {countries.map(c => (
          <option key={c.region} value={`${c.locale}:${c.region}`}>{c.label}</option>
        ))}
      </select>
    </SettingsSection>
  )
}
