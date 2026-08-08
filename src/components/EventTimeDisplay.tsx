import { useTranslation } from 'react-i18next'
import type { EventTime } from '../models'
import { useLocale } from '../hooks/useLocale'
import { formatTimeOfDay, formatTimeRange, formatMonthDay } from '../utils/locale'

interface EventTimeDisplayProps {
  eventTime: EventTime
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
}

export function EventTimeDisplay({ eventTime }: EventTimeDisplayProps) {
  const { t } = useTranslation()
  const locale = useLocale()

  if (eventTime.time_type === 'at') {
    return <span>{formatTimeOfDay(new Date(eventTime.timestamp * 1000), locale)}</span>
  }

  if (eventTime.time_type === 'period') {
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

  // allday: offset을 더해 "원본 타임존의 자정"으로 맞춘 뒤 UTC 기준으로 날짜를 읽음
  // (브라우저 타임존과 무관하게 이벤트 생성 타임존 기준 날짜를 표시)
  // period_end 없는 단일 일자 종일은 시작일 == 종료일로 처리
  const offset = eventTime.seconds_from_gmt
  const periodEnd = eventTime.period_end ?? eventTime.period_start
  const start = new Date((eventTime.period_start + offset) * 1000)
  const end = new Date((periodEnd + offset) * 1000)

  if (isSameDayUTC(start, end)) {
    return <span>{t('eventTime.allday')}</span>
  }
  return (
    <span>
      {formatMonthDay(start, locale, 'UTC')} – {formatMonthDay(end, locale, 'UTC')}
    </span>
  )
}
