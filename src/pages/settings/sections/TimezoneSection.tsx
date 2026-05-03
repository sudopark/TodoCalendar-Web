import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimezoneSetting } from '../../../repositories/caches/settingsCache'
import { SettingsSection, settingsInput, settingsLabel } from '../SettingsSection'
import {
  buildTimezoneList,
  filterTimezones,
  getTimezoneInfo,
  type TimezoneInfo,
} from '../../../utils/timezone'

interface TimezoneRowProps {
  info: TimezoneInfo
  selected: boolean
  systemBadgeLabel?: string
  onClick: () => void
}

function TimezoneRow({ info, selected, systemBadgeLabel, onClick }: TimezoneRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors',
        selected ? 'text-fg bg-surface-elevated' : 'text-fg hover:bg-surface-elevated',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('truncate text-sm', selected && 'font-semibold')}>{info.title}</span>
          {systemBadgeLabel && (
            <span className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-meta font-medium uppercase tracking-wider text-fg-tertiary">
              {systemBadgeLabel}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-tertiary">
          <span className="truncate">{info.identifier}</span>
          {info.abbreviation && (
            <span className="shrink-0 text-fg-quaternary">· {info.abbreviation}</span>
          )}
        </div>
      </div>
      {selected && <Check className="h-4 w-4 mt-1 text-fg shrink-0" strokeWidth={3} />}
    </button>
  )
}

interface Props {
  timezone: TimezoneSetting
  setTimezone: (tz: string | null) => void
}

export function TimezoneSection({ timezone, setTimezone }: Props) {
  const { t, i18n } = useTranslation()
  const { timezone: currentTz, systemTimezone, isCustom } = timezone

  const [query, setQuery] = useState('')
  const locale = i18n.language || 'en'

  const allTimezones = useMemo(() => buildTimezoneList(locale), [locale])
  const systemInfo = useMemo(() => getTimezoneInfo(systemTimezone, locale), [systemTimezone, locale])
  const otherTimezones = useMemo(
    () => allTimezones.filter(tz => tz.identifier !== systemTimezone),
    [allTimezones, systemTimezone],
  )
  const filteredOthers = useMemo(
    () => filterTimezones(otherTimezones, query),
    [otherTimezones, query],
  )
  const systemMatchesQuery = useMemo(
    () => filterTimezones([systemInfo], query).length > 0,
    [systemInfo, query],
  )

  const pinnedInfo = useMemo(
    () => (isCustom ? getTimezoneInfo(currentTz, locale) : systemInfo),
    [isCustom, currentTz, systemInfo, locale],
  )

  const handleSelect = (info: TimezoneInfo, asSystem: boolean) => {
    if (asSystem) {
      if (!isCustom) return
      setTimezone(null)
    } else {
      if (isCustom && info.identifier === currentTz) return
      setTimezone(info.identifier)
    }
  }

  return (
    <SettingsSection title={t('settings.timezone')}>
      <div className="space-y-2">
        <p className={settingsLabel}>{t('settings.timezone_current', '현재 선택')}</p>
        <div className="rounded-lg border border-line overflow-hidden">
          <TimezoneRow
            info={pinnedInfo}
            selected
            systemBadgeLabel={!isCustom ? t('settings.timezone_system_badge', '시스템') : undefined}
            onClick={() => { /* already selected */ }}
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-quaternary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('settings.timezone_search', '타임존 검색')}
          className={cn(settingsInput, 'pl-9')}
        />
      </div>

      <ul className="max-h-[60vh] overflow-y-auto divide-y divide-line rounded-lg border border-line">
        {systemMatchesQuery && (
          <li>
            <TimezoneRow
              info={systemInfo}
              selected={!isCustom}
              systemBadgeLabel={t('settings.timezone_system_badge', '시스템')}
              onClick={() => handleSelect(systemInfo, true)}
            />
          </li>
        )}
        {filteredOthers.length === 0 && !systemMatchesQuery && (
          <li className="px-3 py-4 text-sm text-fg-quaternary text-center">
            {t('settings.timezone_no_results', '검색 결과 없음')}
          </li>
        )}
        {filteredOthers.map(tz => (
          <li key={tz.identifier}>
            <TimezoneRow
              info={tz}
              selected={isCustom && tz.identifier === currentTz}
              onClick={() => handleSelect(tz, false)}
            />
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}
