import { useTranslation } from 'react-i18next'
import { MapPin, Bell, Tag as TagIcon, Link as LinkIcon, FileText } from 'lucide-react'
import { TagSelector } from '../TagSelector'
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
  'w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500'

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200'

interface RowProps {
  icon: React.ReactNode
  children: React.ReactNode
}

function Row({ icon, children }: RowProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400" aria-hidden="true">
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
    <section className="space-y-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      {/* Notifications */}
      <Row icon={<Bell className="h-4 w-4" />}>
        <div className={labelClass}>{t('event.notification')}</div>
        <div className="mt-1">
          <NotificationPicker
            value={notifications}
            onChange={onNotificationsChange}
            isAllDay={isAllDay}
          />
        </div>
      </Row>

      {/* Tag — 시안 정합: 중복 "태그" 라벨 제거, 아이콘 + Selector만 한 줄로 */}
      <Row icon={<TagIcon className="h-4 w-4" />}>
        <TagSelector value={tagId} onChange={onTagChange} />
      </Row>

      {/* Location — URL과 인접하도록 상단 배치 */}
      <Row icon={<MapPin className="h-4 w-4" />}>
        <label htmlFor={placeId} className={labelClass}>{t('event.place')}</label>
        <input
          id={placeId}
          className={`mt-1 ${inputClass}`}
          value={place}
          onChange={e => onPlaceChange(e.target.value)}
        />
      </Row>

      {/* URL */}
      <Row icon={<LinkIcon className="h-4 w-4" />}>
        <label htmlFor={urlId} className={labelClass}>{t('event.url')}</label>
        <input
          id={urlId}
          className={`mt-1 ${inputClass}`}
          value={url}
          onChange={e => onUrlChange(e.target.value)}
        />
      </Row>

      {/* Memo */}
      <Row icon={<FileText className="h-4 w-4" />}>
        <label htmlFor={memoId} className={labelClass}>{t('event.memo')}</label>
        <textarea
          id={memoId}
          className={`mt-1 ${inputClass}`}
          rows={3}
          value={memo}
          onChange={e => onMemoChange(e.target.value)}
        />
      </Row>
    </section>
  )
}
