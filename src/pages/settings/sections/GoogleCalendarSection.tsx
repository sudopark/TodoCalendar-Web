import { useTranslation } from 'react-i18next'

export function GoogleCalendarSection() {
  const { t } = useTranslation()

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.google_calendar')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('settings.google_calendar_coming_soon')}
      </p>
    </section>
  )
}
