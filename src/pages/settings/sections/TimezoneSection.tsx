import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTimezoneStore } from '../../../stores/timezoneStore'
import { SettingsSection, settingsInput } from '../SettingsSection'

export function TimezoneSection() {
  const { t } = useTranslation()
  const { timezone, isCustom, setTimezone } = useTimezoneStore()

  const timezones = useMemo(() => [
    { label: t('settings.timezone_system'), value: '' },
    { label: 'Asia/Seoul (KST)', value: 'Asia/Seoul' },
    { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
    { label: 'Europe/London (GMT)', value: 'Europe/London' },
    { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
    { label: 'UTC', value: 'UTC' },
  ], [t])

  return (
    <SettingsSection title={t('settings.timezone')}>
      <select
        className={settingsInput}
        value={isCustom ? timezone : ''}
        onChange={e => setTimezone(e.target.value || null)}
      >
        {timezones.map(tz => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>
      <p className="text-xs text-[#969696]">
        {t('settings.current_tz', { tz: timezone })}
      </p>
    </SettingsSection>
  )
}
