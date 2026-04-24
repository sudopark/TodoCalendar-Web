import { useTranslation } from 'react-i18next'
import { MapPin, Bell, Tag as TagIcon, Link as LinkIcon, FileText } from 'lucide-react'
import { TagDropdown } from '../TagDropdown'
import { NotificationPicker } from '../NotificationPicker'
import type { NotificationOption } from '../../models'

interface EventDetailsSectionProps {
  place: string
  onPlaceChange: (v: string) => void
  url: string
  onUrlChange: (v: string) => void
  memo: string
  onMemoChange: (v: string) => void
  tagId: string | null
  onTagChange: (v: string | null) => void
  notifications: NotificationOption[]
  onNotificationsChange: (v: NotificationOption[]) => void
  isAllDay: boolean
  fieldPrefix: 'schedule' | 'todo'
}

const inputClass =
  'w-full rounded-md border border-border-light bg-transparent px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-text-primary transition-colors'

interface RowProps {
  icon: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'center'
}

function Row({ icon, children, align = 'center' }: RowProps) {
  return (
    <div className={`flex gap-3 ${align === 'start' ? 'items-start' : 'items-center'}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center text-text-tertiary ${align === 'start' ? 'mt-2' : ''}`} aria-hidden="true">
        {icon}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export function EventDetailsSection({
  place,
  onPlaceChange,
  url,
  onUrlChange,
  memo,
  onMemoChange,
  tagId,
  onTagChange,
  notifications,
  onNotificationsChange,
  isAllDay,
  fieldPrefix,
}: EventDetailsSectionProps) {
  const { t } = useTranslation()
  const placeId = `${fieldPrefix}-place`
  const urlId = `${fieldPrefix}-url`
  const memoId = `${fieldPrefix}-memo`

  return (
    <section className="space-y-4 rounded-xl border border-border-light bg-background p-5 shadow-sm">
      {/* Tag */}
      <Row icon={<TagIcon className="h-4 w-4" />}>
        <TagDropdown value={tagId} onChange={onTagChange} showManageLink />
      </Row>

      {/* Notifications */}
      <Row icon={<Bell className="h-4 w-4" />}>
        <NotificationPicker
          value={notifications}
          onChange={onNotificationsChange}
          isAllDay={isAllDay}
        />
      </Row>

      {/* Place */}
      <Row icon={<MapPin className="h-4 w-4" />}>
        <label htmlFor={placeId} className="sr-only">{t('event.place')}</label>
        <input
          id={placeId}
          className={inputClass}
          placeholder={t('event.place')}
          value={place}
          onChange={e => onPlaceChange(e.target.value)}
        />
      </Row>

      {/* URL */}
      <Row icon={<LinkIcon className="h-4 w-4" />}>
        <label htmlFor={urlId} className="sr-only">{t('event.url')}</label>
        <input
          id={urlId}
          type="url"
          className={inputClass}
          placeholder={t('event.url')}
          value={url}
          onChange={e => onUrlChange(e.target.value)}
        />
      </Row>

      {/* Memo */}
      <Row icon={<FileText className="h-4 w-4" />} align="start">
        <label htmlFor={memoId} className="sr-only">{t('event.memo')}</label>
        <textarea
          id={memoId}
          className={`${inputClass} resize-y`}
          placeholder={t('event.memo')}
          rows={3}
          value={memo}
          onChange={e => onMemoChange(e.target.value)}
        />
      </Row>
    </section>
  )
}
