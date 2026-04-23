import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useEventDefaultsStore } from '../../../stores/eventDefaultsStore'
import { useEventTagStore } from '../../../stores/eventTagStore'

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
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.defaults')}</h2>
      <div>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.default_tag')}</p>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          value={defaultTagId ?? ''}
          onChange={e => setDefaults({ defaultTagId: e.target.value || null })}
        >
          <option value="">{t('settings.none')}</option>
          {Array.from(tags.values()).map(tag => (
            <option key={tag.uuid} value={tag.uuid}>{tag.name}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.default_notification')}</p>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          value={defaultNotificationSeconds ?? ''}
          onChange={e => setDefaults({ defaultNotificationSeconds: e.target.value ? Number(e.target.value) : null })}
        >
          {notificationPresets.map(p => (
            <option key={p.label} value={p.value ?? ''}>{p.label}</option>
          ))}
        </select>
      </div>
    </section>
  )
}
