import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { eventTagApi } from '../api/eventTagApi'
import { settingApi } from '../api/settingApi'
import { EventRepository } from '../repositories/EventRepository'
import { EventDetailRepository } from '../repositories/EventDetailRepository'
import { TagRepository } from '../repositories/TagRepository'

export interface Repositories {
  eventRepo: EventRepository
  eventDetailRepo: EventDetailRepository
  tagRepo: TagRepository
}

export const repositories: Repositories = {
  eventRepo: new EventRepository({ todoApi, scheduleApi }),
  eventDetailRepo: new EventDetailRepository({ api: eventDetailApi }),
  tagRepo: new TagRepository({ eventTagApi, settingApi }),
}
