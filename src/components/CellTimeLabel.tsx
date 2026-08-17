import { useTranslation } from 'react-i18next'
import type { EventTime } from '../models'
import { useLocale } from '../hooks/useLocale'
import { formatTimeOfDay, formatMonthDay } from '../utils/locale'

interface CellTimeLabelProps {
  type: 'todo' | 'schedule'
  eventTime?: EventTime | null
}

const timeShort = (ts: number, locale: string) => formatTimeOfDay(new Date(ts * 1000), locale)
const dateShort = (ts: number, locale: string) => formatMonthDay(new Date(ts * 1000), locale)

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1 * 1000)
  const d2 = new Date(ts2 * 1000)
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
}

/**
 * iOS 스타일 좌측 52px 시간 라벨.
 * singleText: 한 줄 표시, doubleText: 상/하 두 줄 표시.
 */
export function CellTimeLabel({ type, eventTime }: CellTimeLabelProps) {
  const { t } = useTranslation()
  const locale = useLocale()

  if (type === 'todo') {
    return <TodoTimeLabel eventTime={eventTime} locale={locale} t={t} />
  }
  if (!eventTime) return null
  return <ScheduleTimeLabel eventTime={eventTime} locale={locale} t={t} />
}

interface TimeLabelProps {
  eventTime?: EventTime | null
  locale: string
  t: (key: string) => string
}

function TodoTimeLabel({ eventTime, locale, t }: TimeLabelProps) {
  if (!eventTime) {
    return <SingleLine text={t('eventType.todo')} />
  }

  if (eventTime.time_type === 'at') {
    return <DoubleLine top={t('eventType.todo')} bottom={timeShort(eventTime.timestamp, locale)} />
  }

  if (eventTime.time_type === 'allday') {
    return <DoubleLine top={t('eventType.todo')} bottom={t('eventTime.allday')} />
  }

  // period
  return <DoubleLine top={t('eventType.todo')} bottom={timeShort(eventTime.period_start, locale)} />
}

function ScheduleTimeLabel({ eventTime, locale, t }: TimeLabelProps & { eventTime: EventTime }) {
  if (eventTime.time_type === 'at') {
    return <SingleLine text={timeShort(eventTime.timestamp, locale)} />
  }

  if (eventTime.time_type === 'allday') {
    return <SingleLine text={t('eventTime.allday')} />
  }

  // period
  if (isSameDay(eventTime.period_start, eventTime.period_end)) {
    return (
      <DoubleLine
        top={timeShort(eventTime.period_start, locale)}
        bottom={timeShort(eventTime.period_end, locale)}
      />
    )
  }

  return (
    <DoubleLine
      top={dateShort(eventTime.period_start, locale)}
      bottom={timeShort(eventTime.period_end, locale)}
    />
  )
}

function SingleLine({ text }: { text: string }) {
  return (
    <p className="text-xs text-fg text-center truncate leading-tight">{text}</p>
  )
}

function DoubleLine({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-fg truncate leading-tight">{top}</p>
      <p className="text-meta text-fg-secondary truncate leading-tight">{bottom}</p>
    </div>
  )
}
