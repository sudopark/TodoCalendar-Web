import type { EventTime } from '../models'

interface CellTimeLabelProps {
  type: 'todo' | 'schedule'
  eventTime?: EventTime | null
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDateShort(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
  if (type === 'todo') {
    return <TodoTimeLabel eventTime={eventTime} />
  }
  return <ScheduleTimeLabel eventTime={eventTime!} />
}

function TodoTimeLabel({ eventTime }: { eventTime?: EventTime | null }) {
  if (!eventTime) {
    return <SingleLine text="Todo" />
  }

  if (eventTime.time_type === 'at') {
    return <DoubleLine top="Todo" bottom={formatTimeShort(eventTime.timestamp)} />
  }

  if (eventTime.time_type === 'allday') {
    return <DoubleLine top="Todo" bottom="Allday" />
  }

  // period
  return <DoubleLine top="Todo" bottom={formatTimeShort(eventTime.period_start)} />
}

function ScheduleTimeLabel({ eventTime }: { eventTime: EventTime }) {
  if (eventTime.time_type === 'at') {
    return <SingleLine text={formatTimeShort(eventTime.timestamp)} />
  }

  if (eventTime.time_type === 'allday') {
    return <SingleLine text="Allday" />
  }

  // period
  if (isSameDay(eventTime.period_start, eventTime.period_end)) {
    return (
      <DoubleLine
        top={formatTimeShort(eventTime.period_start)}
        bottom={formatTimeShort(eventTime.period_end)}
      />
    )
  }

  return (
    <DoubleLine
      top={formatDateShort(eventTime.period_start)}
      bottom={formatTimeShort(eventTime.period_end)}
    />
  )
}

function SingleLine({ text }: { text: string }) {
  return (
    <p className="text-xs text-[#323232] text-center truncate leading-tight">{text}</p>
  )
}

function DoubleLine({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-[#323232] truncate leading-tight">{top}</p>
      <p className="text-[10px] text-[#646464] truncate leading-tight">{bottom}</p>
    </div>
  )
}
