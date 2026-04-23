import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '../../../stores/notificationStore'

export function NotificationSection() {
  const { t } = useTranslation()
  const permission = useNotificationStore(s => s.permission)
  const requestPermission = useNotificationStore(s => s.requestPermission)

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.notification')}</h2>
      {permission === 'granted' ? (
        <p className="text-sm text-green-600 dark:text-green-400">{t('settings.notification_granted')}</p>
      ) : permission === 'denied' ? (
        <p className="text-sm text-red-500">{t('settings.notification_denied')}</p>
      ) : (
        <button
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={requestPermission}
        >
          {t('settings.notification_allow')}
        </button>
      )}
    </section>
  )
}
