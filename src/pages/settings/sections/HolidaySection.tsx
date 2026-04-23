import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useHolidayStore, type HolidayCountry } from '../../../stores/holidayStore'

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
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.holiday_country')}</h2>
      <select
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
    </section>
  )
}
