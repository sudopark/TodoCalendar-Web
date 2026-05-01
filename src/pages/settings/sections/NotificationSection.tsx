import { useTranslation } from 'react-i18next'
import type { NotificationSetting } from '../../../repositories/caches/settingsCache'
import { SettingsSection, settingsBtnSecondary } from '../SettingsSection'

interface Props {
  notification: NotificationSetting
  requestNotificationPermission: () => Promise<void>
}

export function NotificationSection({ notification, requestNotificationPermission }: Props) {
  const { t } = useTranslation()
  const { permission } = notification

  return (
    <SettingsSection title={t('settings.notification')}>
      {permission === 'granted' ? (
        <p className="text-sm text-fg">{t('settings.notification_granted')}</p>
      ) : permission === 'denied' ? (
        <p className="text-sm text-red-500">{t('settings.notification_denied')}</p>
      ) : (
        <div>
          <button className={settingsBtnSecondary} onClick={requestNotificationPermission}>
            {t('settings.notification_allow')}
          </button>
        </div>
      )}
    </SettingsSection>
  )
}
