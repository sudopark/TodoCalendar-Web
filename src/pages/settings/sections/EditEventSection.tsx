import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventDefaultsStore } from '../../../stores/eventDefaultsStore'
import { useEventTagStore } from '../../../stores/eventTagStore'
import { APP_FALLBACK_DEFAULT_COLOR } from '../../../domain/tag/resolveEventTag'
import { SettingsSection, settingsInput, settingsLabel } from '../SettingsSection'

interface NotificationPreset {
  label: string
  value: number | null
}

function useNotificationPresets(): NotificationPreset[] {
  const { t } = useTranslation()
  return useMemo(() => [
    { label: t('settings.none'), value: null },
    { label: t('settings.notif_5min'), value: -300 },
    { label: t('settings.notif_10min'), value: -600 },
    { label: t('settings.notif_30min'), value: -1800 },
    { label: t('settings.notif_1hour'), value: -3600 },
  ], [t])
}

interface SelectedTagChipProps {
  name: string
  color: string
  active: boolean
  onClick: () => void
}

function SelectedTagChip({ name, color, active, onClick }: SelectedTagChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 h-8 text-sm font-medium transition-colors max-w-full',
        active
          ? 'bg-gray-100 text-[#1f1f1f]'
          : 'bg-gray-100 text-[#1f1f1f] hover:bg-gray-200',
      )}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="truncate">{name}</span>
      <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />
    </button>
  )
}

export function EditEventSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { subView } = useParams<{ subView?: string }>()
  const {
    defaultTagId,
    defaultNotificationSeconds,
    defaultAllDayNotificationSeconds,
    setDefaults,
  } = useEventDefaultsStore()
  const tags = useEventTagStore(s => s.tags)
  const defaultTagColors = useEventTagStore(s => s.defaultTagColors)

  const notificationPresets = useNotificationPresets()
  const tagsOpen = subView === 'tags'
  const defaultTagOpen = subView === 'defaultTag'

  const baseDefaultColor =
    (defaultTagColors?.default && defaultTagColors.default.length > 0
      ? defaultTagColors.default
      : APP_FALLBACK_DEFAULT_COLOR)

  const selectedTag = defaultTagId ? tags.get(defaultTagId) : undefined
  const selectedName = selectedTag?.name ?? t('tag.default_name', '기본')
  const selectedColor =
    selectedTag?.color_hex ?? (defaultTagId ? APP_FALLBACK_DEFAULT_COLOR : baseDefaultColor)

  return (
    <div className="space-y-14">
      <SettingsSection title={t('settings.defaults')}>
        <div className="flex items-center justify-between gap-4">
          <p className={cn(settingsLabel, 'shrink-0')}>{t('settings.default_tag')}</p>
          <SelectedTagChip
            name={selectedName}
            color={selectedColor}
            active={defaultTagOpen}
            onClick={() => navigate('/settings/editEvent/defaultTag')}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className={cn(settingsLabel, 'shrink-0')}>{t('settings.event_notification')}</p>
          <select
            className={cn(settingsInput, 'max-w-[60%]')}
            value={defaultNotificationSeconds ?? ''}
            onChange={e => setDefaults({
              defaultNotificationSeconds: e.target.value ? Number(e.target.value) : null,
            })}
          >
            {notificationPresets.map(p => (
              <option key={p.label} value={p.value ?? ''}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className={cn(settingsLabel, 'shrink-0')}>{t('settings.allday_event_notification')}</p>
          <select
            className={cn(settingsInput, 'max-w-[60%]')}
            value={defaultAllDayNotificationSeconds ?? ''}
            onChange={e => setDefaults({
              defaultAllDayNotificationSeconds: e.target.value ? Number(e.target.value) : null,
            })}
          >
            {notificationPresets.map(p => (
              <option key={p.label} value={p.value ?? ''}>{p.label}</option>
            ))}
          </select>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.management', '관리')}>
        <button
          type="button"
          onClick={() => navigate('/settings/editEvent/tags')}
          aria-current={tagsOpen ? 'page' : undefined}
          className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
            tagsOpen
              ? 'bg-gray-50 text-[#1f1f1f] font-semibold'
              : 'text-[#1f1f1f] hover:bg-gray-50 font-medium'
          }`}
        >
          <span>{t('tag.event_types', '이벤트 종류')}</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </SettingsSection>
    </div>
  )
}
