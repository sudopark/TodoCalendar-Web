import { useTranslation } from 'react-i18next'
import type { EventTime } from '../models'
import { useLocale } from '../hooks/useLocale'
import { formatTimeOfDay, formatTimeRange } from '../utils/locale'

export function TimeDescription({ eventTime }: { eventTime?: EventTime | null }) {
  const { t } = useTranslation()
  const locale = useLocale()

  if (!eventTime) return <span>{t('eventType.todo')}</span>
  switch (eventTime.time_type) {
    case 'at':
      return <span>{formatTimeOfDay(new Date(eventTime.timestamp * 1000), locale)}</span>
    case 'allday':
      return <span>{t('eventTime.allday')}</span>
    case 'period':
      return (
        <span>
          {formatTimeRange(
            new Date(eventTime.period_start * 1000),
            new Date(eventTime.period_end * 1000),
            locale,
          )}
        </span>
      )
  }
}
