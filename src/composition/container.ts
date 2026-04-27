import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { EventRepository } from '../repositories/EventRepository'

export interface Repositories {
  eventRepo: EventRepository
}

export const repositories: Repositories = {
  eventRepo: new EventRepository({ todoApi, scheduleApi }),
}
