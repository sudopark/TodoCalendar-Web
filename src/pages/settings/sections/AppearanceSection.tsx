import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useThemeStore } from '../../../stores/themeStore'
import { useCalendarAppearanceStore } from '../../../stores/calendarAppearanceStore'
import { useToastStore } from '../../../stores/toastStore'
import { settingApi } from '../../../api/settingApi'
import { ColorPalette } from '../../../components/ColorPalette'
import type { DefaultTagColors } from '../../../models'
import {
  SettingsSection,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsLabel,
} from '../SettingsSection'

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

  const themeOptions = [
    { id: 'system' as const, label: t('settings.theme_system') },
    { id: 'light' as const, label: t('settings.theme_light') },
    { id: 'dark' as const, label: t('settings.theme_dark') },
  ]

  return (
    <div className="space-y-10">
      <SettingsSection title={t('settings.theme')}>
        <div className="flex gap-2">
          {themeOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                'rounded-full px-4 h-9 text-sm font-medium transition-colors',
                theme === opt.id
                  ? 'bg-[#1f1f1f] text-white'
                  : 'bg-gray-100 text-[#1f1f1f] hover:bg-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.calendar_appearance')}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={settingsLabel}>{t('settings.row_height')}</span>
            <span className={settingsLabel}>{rowHeight}px</span>
          </div>
          <input
            type="range"
            min={50}
            max={120}
            value={rowHeight}
            onChange={e => setAppearance({ rowHeight: Number(e.target.value) })}
            className="w-full accent-[#1f1f1f]"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={settingsLabel}>{t('settings.font_size')}</span>
            <span className={settingsLabel}>{fontSize}px</span>
          </div>
          <input
            type="range"
            min={10}
            max={18}
            value={fontSize}
            onChange={e => setAppearance({ fontSize: Number(e.target.value) })}
            className="w-full accent-[#1f1f1f]"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#1f1f1f]">{t('settings.show_event_names')}</span>
          <button
            onClick={() => setAppearance({ showEventNames: !showEventNames })}
            aria-pressed={showEventNames}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              showEventNames ? 'bg-[#1f1f1f]' : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                showEventNames ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
        </div>
        <div className="pt-2">
          <button className={settingsBtnSecondary} onClick={resetToDefaults}>
            {t('settings.reset_defaults')}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.tag_colors')}>
        {editColors && (
          <>
            <div className="space-y-2">
              <p className={settingsLabel}>{t('settings.holiday_color')}</p>
              <ColorPalette
                selected={editColors.holiday}
                onChange={hex => setEditColors(c => c ? { ...c, holiday: hex } : c)}
              />
            </div>
            <div className="space-y-2">
              <p className={settingsLabel}>{t('settings.default_color')}</p>
              <ColorPalette
                selected={editColors.default}
                onChange={hex => setEditColors(c => c ? { ...c, default: hex } : c)}
              />
            </div>
            <div className="pt-2">
              <button className={settingsBtnPrimary} onClick={handleSaveColors}>
                {t('settings.save_colors')}
              </button>
            </div>
          </>
        )}
      </SettingsSection>
    </div>
  )
}
