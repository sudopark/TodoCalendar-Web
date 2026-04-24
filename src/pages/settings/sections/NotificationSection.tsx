import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '../../../stores/notificationStore'
import { SettingsSection, settingsBtnSecondary } from '../SettingsSection'

export function NotificationSection() {
  const { t } = useTranslation()
  const permission = useNotificationStore(s => s.permission)
  const requestPermission = useNotificationStore(s => s.requestPermission)

  return (
    <SettingsSection title={t('settings.notification')}>
      {permission === 'granted' ? (
        <p className="text-sm text-[#1f1f1f]">{t('settings.notification_granted')}</p>
      ) : permission === 'denied' ? (
        <p className="text-sm text-red-500">{t('settings.notification_denied')}</p>
      ) : (
        <div>
          <button className={settingsBtnSecondary} onClick={requestPermission}>
            {t('settings.notification_allow')}
          </button>
        </div>
      )}
    </SettingsSection>
  )
}
