import { Badge } from '@/components/ui/badge'
import { useEventFormStore, calculateDDay } from '../../stores/eventFormStore'
import { CalendarDays } from 'lucide-react'

export function DDayBadge() {
  const eventTime = useEventFormStore(s => s.eventTime)
  const dday = calculateDDay(eventTime)

  if (dday === null) return null

  const label = dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`

  return (
    <div className="flex items-center gap-3">
      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
      <Badge variant="secondary" className="text-xs gap-1">
        {label}
      </Badge>
    </div>
  )
}
