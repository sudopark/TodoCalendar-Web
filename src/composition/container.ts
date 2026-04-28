import i18n from '../i18n'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { eventTagApi } from '../api/eventTagApi'
import { settingApi } from '../api/settingApi'
import { holidayApi } from '../api/holidayApi'
import { EventRepository } from '../repositories/EventRepository'
import { EventDetailRepository } from '../repositories/EventDetailRepository'
import { TagRepository } from '../repositories/TagRepository'
import { HolidayRepository } from '../repositories/HolidayRepository'

const holidayRepo = new HolidayRepository({
  api: holidayApi,
  initialLocale: i18n.language || 'en',
})
// composition root 에서만 i18n 이벤트 처리 — Repository 자체는 i18n 무지
i18n.on('languageChanged', (lng: string) => holidayRepo.setLocale(lng))

export interface Repositories {
  eventRepo: EventRepository
  eventDetailRepo: EventDetailRepository
  tagRepo: TagRepository
  holidayRepo: HolidayRepository
}

export const repositories: Repositories = {
  eventRepo: new EventRepository({ todoApi, scheduleApi }),
  eventDetailRepo: new EventDetailRepository({ api: eventDetailApi }),
  tagRepo: new TagRepository({ eventTagApi, settingApi }),
  holidayRepo,
}
