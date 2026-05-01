import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
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
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('settings.back')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-fg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-fg">{t('settings.title')}</h1>
      </div>

      <ul className="flex flex-col py-3">
        {SETTING_CATEGORIES.map(cat => {
          const isSelected = cat.id === selected
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onSelect(cat.id)}
                aria-current={isSelected ? 'page' : undefined}
                className={cn(
                  'relative flex w-full items-center px-6 py-2.5 text-left text-sm transition-colors',
                  isSelected
                    ? 'font-semibold text-fg'
                    : 'font-medium text-fg-secondary hover:text-fg hover:bg-gray-50',
                )}
              >
                {isSelected && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-action" aria-hidden="true" />
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
