import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { EventRepository } from '../repositories/EventRepository'
import { EventDetailRepository } from '../repositories/EventDetailRepository'

export interface Repositories {
  eventRepo: EventRepository
  eventDetailRepo: EventDetailRepository
}

export const repositories: Repositories = {
  eventRepo: new EventRepository({ todoApi, scheduleApi }),
  eventDetailRepo: new EventDetailRepository({ api: eventDetailApi }),
}
