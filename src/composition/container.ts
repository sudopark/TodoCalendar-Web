import i18n from '../i18n'
import { FALLBACK_LANGUAGE } from '../i18n/resolveLanguage'
import { todoApi } from '../api/todoApi'
import { scheduleApi } from '../api/scheduleApi'
import { eventDetailApi } from '../api/eventDetailApi'
import { eventTagApi } from '../api/eventTagApi'
import { settingApi } from '../api/settingApi'
import { holidayApi } from '../api/holidayApi'
import { doneTodoApi } from '../api/doneTodoApi'
import { foremostApi } from '../api/foremostApi'
import { firebaseAuthApi } from '../api/firebaseAuthApi'
import { setUnauthorizedHandler, setAcceptLanguageProvider } from '../api/apiClient'
import { createOAuthAsApi } from '../api/oauthAsApi'
import { EventRepository } from '../repositories/EventRepository'
import { EventDetailRepository } from '../repositories/EventDetailRepository'
import { TagRepository } from '../repositories/TagRepository'
import { HolidayRepository } from '../repositories/HolidayRepository'
import { DoneTodoRepository } from '../repositories/DoneTodoRepository'
import { ForemostEventRepository } from '../repositories/ForemostEventRepository'
import { AuthRepository } from '../repositories/AuthRepository'
import { SettingsRepository } from '../repositories/SettingsRepository'
import { OAuthConsentRepository } from '../repositories/OAuthConsentRepository'
import { LocalStorageContainer } from '../repositories/local-storage/LocalStorageContainer'

const localStorageContainer = new LocalStorageContainer()

// 공휴일 API 는 Google Calendar holiday 캘린더 id(`${locale}.${countryCode}.official#holiday@group.v.calendar.google.com`)
// 에 locale 을 그대로 꽂아 넣는다. 이 id 가 유효한 값은 사실상 ko/en 뿐이라 나머지 29개 UI 언어 태그를
// 그대로 보내면 조회가 통째로 실패한다 (TodoCalendar-Functions holidayService.js). ko/en 으로 clamp.
function toHolidayApiLocale(uiLanguage: string): 'ko' | 'en' {
  return uiLanguage === 'ko' ? 'ko' : 'en'
}

const holidayRepo = new HolidayRepository({
  api: holidayApi,
  initialLocale: toHolidayApiLocale(FALLBACK_LANGUAGE),
  localStorageContainer,
})
// composition root 에서만 i18n 이벤트 처리 — Repository 자체는 i18n 무지
i18n.on('languageChanged', (lng: string) => holidayRepo.setLocale(toHolidayApiLocale(lng)))

const authRepo = new AuthRepository({ api: firebaseAuthApi, localStorageContainer })

// 401 응답 시 AuthRepository를 통해 로그아웃 처리 — apiClient가 store를 직접 참조하지 않는다
setUnauthorizedHandler(() => { authRepo.signOut() })

// 서버 응답 로컬라이제이션용 — api 레이어는 i18n 에 무지, composition root 에서만 주입
setAcceptLanguageProvider(() => i18n.language)

const oauthAsBaseUrl = import.meta.env.VITE_OAUTH_AS_BASE_URL
if (!oauthAsBaseUrl) {
  throw new Error('VITE_OAUTH_AS_BASE_URL 이 설정되지 않았습니다. .env 를 확인하세요.')
}
const oauthAsApi = createOAuthAsApi(oauthAsBaseUrl)
const oauthConsentRepo = new OAuthConsentRepository({ api: oauthAsApi })

export interface Repositories {
  eventRepo: EventRepository
  eventDetailRepo: EventDetailRepository
  tagRepo: TagRepository
  holidayRepo: HolidayRepository
  doneTodoRepo: DoneTodoRepository
  foremostEventRepo: ForemostEventRepository
  authRepo: AuthRepository
  settingsRepo: SettingsRepository
  oauthConsentRepo: OAuthConsentRepository
  oauthConsentCallbackUrl: string
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
  oauthConsentRepo,
  oauthConsentCallbackUrl: `${oauthAsBaseUrl}/v1/oauth/consent/callback`,
  localStorageContainer,
}
