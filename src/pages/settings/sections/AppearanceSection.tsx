import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../../../stores/themeStore'
import { useCalendarAppearanceStore } from '../../../stores/calendarAppearanceStore'
import { useToastStore } from '../../../stores/toastStore'
import { settingApi } from '../../../api/settingApi'
import { ColorPalette } from '../../../components/ColorPalette'
import type { DefaultTagColors } from '../../../models'

export function AppearanceSection() {
  const { t } = useTranslation()
  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)
  const { rowHeight, fontSize, showEventNames, setAppearance, resetToDefaults } = useCalendarAppearanceStore()

  const [editColors, setEditColors] = useState<DefaultTagColors | null>(null)

  useEffect(() => {
    settingApi.getDefaultTagColors()
      .then(c => setEditColors(c))
      .catch(e => {
        console.warn('색상 로드 실패:', e)
        useToastStore.getState().show(t('settings.colors_load_failed'), 'error')
      })
  }, [t])

  const handleSaveColors = async () => {
    if (!editColors) return
    try {
      const updated = await settingApi.updateDefaultTagColors(editColors)
      setEditColors(updated)
      useToastStore.getState().show(t('settings.colors_saved'), 'success')
    } catch (e) {
      console.warn('색상 저장 실패:', e)
      useToastStore.getState().show(t('settings.colors_save_failed'), 'error')
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.theme')}</h2>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map(th => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              className={`rounded-lg px-3 py-2 text-sm ${theme === th ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
            >
              {th === 'system' ? t('settings.theme_system') : th === 'light' ? t('settings.theme_light') : t('settings.theme_dark')}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.calendar_appearance')}</h2>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('settings.row_height')}</span>
            <span>{rowHeight}px</span>
          </label>
          <input
            type="range"
            min={50}
            max={120}
            value={rowHeight}
            onChange={e => setAppearance({ rowHeight: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{t('settings.font_size')}</span>
            <span>{fontSize}px</span>
          </label>
          <input
            type="range"
            min={10}
            max={18}
            value={fontSize}
            onChange={e => setAppearance({ fontSize: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('settings.show_event_names')}</span>
          <button
            onClick={() => setAppearance({ showEventNames: !showEventNames })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showEventNames ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showEventNames ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <button
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={resetToDefaults}
        >
          {t('settings.reset_defaults')}
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.tag_colors')}</h2>
        {editColors && (
          <>
            <div>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.holiday_color')}</p>
              <ColorPalette
                selected={editColors.holiday}
                onChange={hex => setEditColors(c => c ? { ...c, holiday: hex } : c)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.default_color')}</p>
              <ColorPalette
                selected={editColors.default}
                onChange={hex => setEditColors(c => c ? { ...c, default: hex } : c)}
              />
            </div>
            <button
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              onClick={handleSaveColors}
            >
              {t('settings.save_colors')}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
