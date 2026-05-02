import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EventDefaults } from '../../../repositories/caches/settingsCache'
import type { DefaultTagColors, EventTag } from '../../../models'
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
          ? 'bg-surface-sunken text-fg'
          : 'bg-surface-sunken text-fg hover:bg-surface-elevated',
      )}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="truncate">{name}</span>
      <ChevronRight className="h-3.5 w-3.5 text-fg-tertiary shrink-0" />
    </button>
  )
}

interface Props {
  eventDefaults: EventDefaults
  setEventDefaults: (updates: Partial<EventDefaults>) => void
  tags: Map<string, EventTag>
  defaultTagColors: DefaultTagColors | null
  onNavigate: (path: string) => void
}

export function EditEventSection({
  eventDefaults,
  setEventDefaults,
  tags,
  defaultTagColors,
  onNavigate,
}: Props) {
  const { t } = useTranslation()
  const { subView } = useParams<{ subView?: string }>()
  const {
    defaultTagId,
    defaultNotificationSeconds,
    defaultAllDayNotificationSeconds,
  } = eventDefaults

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
            onClick={() => onNavigate('/settings/editEvent/defaultTag')}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className={cn(settingsLabel, 'shrink-0')}>{t('settings.event_notification')}</p>
          <select
            className={cn(settingsInput, 'max-w-[60%]')}
            value={defaultNotificationSeconds ?? ''}
            onChange={e => setEventDefaults({
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
            onChange={e => setEventDefaults({
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
          onClick={() => onNavigate('/settings/editEvent/tags')}
          aria-current={tagsOpen ? 'page' : undefined}
          className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
            tagsOpen
              ? 'bg-surface-elevated text-fg font-semibold'
              : 'text-fg hover:bg-surface-elevated font-medium'
          }`}
        >
          <span>{t('tag.event_types', '이벤트 종류')}</span>
          <ChevronRight className="h-4 w-4 text-fg-quaternary" />
        </button>
      </SettingsSection>
    </div>
  )
}
