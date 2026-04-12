import type { EventTime } from '../models'

export function TimeDescription({ eventTime }: { eventTime?: EventTime | null }) {
  if (!eventTime) return <span>Todo</span>
  switch (eventTime.time_type) {
    case 'at': {
      const d = new Date(eventTime.timestamp * 1000)
      return <span>{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
    }
    case 'allday':
      return <span>All day</span>
    case 'period': {
      const start = new Date(eventTime.period_start * 1000)
      const end = new Date(eventTime.period_end * 1000)
      const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      return <span>{fmt(start)} - {fmt(end)}</span>
    }
  }
}
