import i18n from '../i18n'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { eventTagApi } from '../api/eventTagApi'
import { settingApi } from '../api/settingApi'
import { holidayApi } from '../api/holidayApi'
import { doneTodoApi } from '../api/doneTodoApi'
import { foremostApi } from '../api/foremostApi'
import { firebaseAuthApi } from '../api/firebaseAuthApi'
import { setUnauthorizedHandler } from '../api/apiClient'
import { EventRepository } from '../repositories/EventRepository'
import { EventDetailRepository } from '../repositories/EventDetailRepository'
import { TagRepository } from '../repositories/TagRepository'
import { HolidayRepository } from '../repositories/HolidayRepository'
import { DoneTodoRepository } from '../repositories/DoneTodoRepository'
import { ForemostEventRepository } from '../repositories/ForemostEventRepository'
import { AuthRepository } from '../repositories/AuthRepository'
import { SettingsRepository } from '../repositories/SettingsRepository'
import { LocalStorageContainer } from '../repositories/local-storage/LocalStorageContainer'

const localStorageContainer = new LocalStorageContainer()

const holidayRepo = new HolidayRepository({
  api: holidayApi,
  initialLocale: i18n.language || 'en',
  localStorageContainer,
})
// composition root 에서만 i18n 이벤트 처리 — Repository 자체는 i18n 무지
i18n.on('languageChanged', (lng: string) => holidayRepo.setLocale(lng))

const authRepo = new AuthRepository({ api: firebaseAuthApi, localStorageContainer })

// 401 응답 시 AuthRepository를 통해 로그아웃 처리 — apiClient가 store를 직접 참조하지 않는다
setUnauthorizedHandler(() => { authRepo.signOut() })

export interface Repositories {
  eventRepo: EventRepository
  eventDetailRepo: EventDetailRepository
  tagRepo: TagRepository
  holidayRepo: HolidayRepository
  doneTodoRepo: DoneTodoRepository
  foremostEventRepo: ForemostEventRepository
  authRepo: AuthRepository
  settingsRepo: SettingsRepository
  localStorageContainer: LocalStorageContainer
}

const eventRepo = new EventRepository({ todoApi, scheduleApi, localStorageContainer })
const tagRepo = new TagRepository({ eventTagApi, settingApi, localStorageContainer, eventRepo })

export const repositories: Repositories = {
  eventRepo,
  eventDetailRepo: new EventDetailRepository({ api: eventDetailApi, localStorageContainer }),
  tagRepo,
  holidayRepo,
  doneTodoRepo: new DoneTodoRepository({ api: doneTodoApi, localStorageContainer }),
  foremostEventRepo: new ForemostEventRepository({ api: foremostApi, localStorageContainer }),
  authRepo,
  settingsRepo: new SettingsRepository(),
  localStorageContainer,
}
