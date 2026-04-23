import { useTranslation } from 'react-i18next'
import { SETTING_CATEGORIES, type SettingCategoryId } from './settingCategory'

interface Props {
  selected: SettingCategoryId
  onSelect: (id: SettingCategoryId) => void
  onBack: () => void
}

export function SettingsMenu({ selected, onSelect, onBack }: Props) {
  const { t } = useTranslation()

  return (
    <nav className="flex flex-col" aria-label={t('settings.title')}>
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('settings.back')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
      </div>

      <ul className="flex flex-col py-2">
        {SETTING_CATEGORIES.map(cat => {
          const isSelected = cat.id === selected
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onSelect(cat.id)}
                aria-current={isSelected ? 'page' : undefined}
                className={[
                  'relative flex w-full items-center px-6 py-2.5 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-blue-500" aria-hidden="true" />
                )}
                {t(cat.labelKey)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
