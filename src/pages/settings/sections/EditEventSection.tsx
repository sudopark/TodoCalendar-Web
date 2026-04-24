import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventDefaultsStore } from '../../../stores/eventDefaultsStore'
import { useEventTagStore } from '../../../stores/eventTagStore'
import { SettingsSection, settingsInput, settingsLabel } from '../SettingsSection'

export function EditEventSection() {
  const { t } = useTranslation()
  const { defaultTagId, defaultNotificationSeconds, setDefaults } = useEventDefaultsStore()
  const tags = useEventTagStore(s => s.tags)

  const notificationPresets = useMemo(() => [
    { label: t('settings.none'), value: null },
    { label: t('settings.notif_5min'), value: -300 },
    { label: t('settings.notif_10min'), value: -600 },
    { label: t('settings.notif_30min'), value: -1800 },
    { label: t('settings.notif_1hour'), value: -3600 },
  ], [t])

  return (
    <SettingsSection title={t('settings.defaults')}>
      <div className="space-y-2">
        <p className={settingsLabel}>{t('settings.default_tag')}</p>
        <select
          className={settingsInput}
          value={defaultTagId ?? ''}
          onChange={e => setDefaults({ defaultTagId: e.target.value || null })}
        >
          <option value="">{t('settings.none')}</option>
          {Array.from(tags.values()).map(tag => (
            <option key={tag.uuid} value={tag.uuid}>{tag.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <p className={settingsLabel}>{t('settings.default_notification')}</p>
        <select
          className={settingsInput}
          value={defaultNotificationSeconds ?? ''}
          onChange={e => setDefaults({ defaultNotificationSeconds: e.target.value ? Number(e.target.value) : null })}
        >
          {notificationPresets.map(p => (
            <option key={p.label} value={p.value ?? ''}>{p.label}</option>
          ))}
        </select>
      </div>
    </SettingsSection>
  )
}
