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
import { createPublicDocApi } from '../api/publicDocApi'
import { EventRepository } from '../repositories/EventRepository'
import { EventDetailRepository } from '../repositories/EventDetailRepository'
import { TagRepository } from '../repositories/TagRepository'
import { HolidayRepository } from '../repositories/HolidayRepository'
import { DoneTodoRepository } from '../repositories/DoneTodoRepository'
import { ForemostEventRepository } from '../repositories/ForemostEventRepository'
import { AuthRepository } from '../repositories/AuthRepository'
import { SettingsRepository } from '../repositories/SettingsRepository'
import { OAuthConsentRepository } from '../repositories/OAuthConsentRepository'
import { PublicDocRepository } from '../repositories/PublicDocRepository'
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
let holidayApiLocale = toHolidayApiLocale(FALLBACK_LANGUAGE)
i18n.on('languageChanged', (lng: string) => {
  const next = toHolidayApiLocale(lng)
  if (next === holidayApiLocale) return
  holidayApiLocale = next
  holidayRepo.setLocale(next)
  // 화면 이동 없이 언어만 바꾸는 경로(툴바 LanguagePicker)에서는 재조회를 태울 다른 계기가 없다.
  holidayRepo.refetchLoadedYears()
})

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

// 환경별 문서 소스 교체용. 미설정 시 운영 기본값 — 공개 URL 이라 항상 동작해야 하므로 throw 하지 않는다.
const publicDocsBaseUrl =
  import.meta.env.VITE_PUBLIC_DOCS_BASE_URL ||
  'https://raw.githubusercontent.com/sudopark/TodoCalendar-Terms/main'
const publicDocRepo = new PublicDocRepository({ api: createPublicDocApi(publicDocsBaseUrl) })

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
  publicDocRepo: PublicDocRepository
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
  publicDocRepo,
  localStorageContainer,
}
