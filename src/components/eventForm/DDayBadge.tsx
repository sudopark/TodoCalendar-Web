import { Badge } from '@/components/ui/badge'
import { useEventFormStore, calculateDDay } from '../../stores/eventFormStore'

export function DDayBadge() {
  const eventTime = useEventFormStore(s => s.eventTime)
  const dday = calculateDDay(eventTime)

  if (dday === null) return null

  const label = dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`

  return (
    <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold tracking-wide">
      {label}
    </Badge>
  )
}
