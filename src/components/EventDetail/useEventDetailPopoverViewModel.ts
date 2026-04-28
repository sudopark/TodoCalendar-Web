import { useState, useEffect } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { EventDetail } from '../../models'

// MARK: - Interface

export interface EventDetailPopoverViewModel {
  eventDetail: EventDetail | null
}

// MARK: - Hook

export function useEventDetailPopoverViewModel(
  calEvent: CalendarEvent,
): EventDetailPopoverViewModel {
  const { eventDetailRepo } = useRepositories()
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null)

  const eventId = calEvent.event.uuid

  useEffect(() => {
    let cancelled = false
    eventDetailRepo.get(eventId).then(detail => {
      if (!cancelled) setEventDetail(detail)
    })
    return () => { cancelled = true }
  }, [eventId, eventDetailRepo])

  return { eventDetail }
}
