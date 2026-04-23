import { useTranslation } from 'react-i18next'

export function LanguageSection() {
  const { t, i18n } = useTranslation()

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.language')}</h2>
      <select
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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
    </section>
  )
}
