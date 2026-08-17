import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from './i18n/supportedLanguages'
import { resolveLanguage, FALLBACK_LANGUAGE } from './i18n/resolveLanguage'
import { loaderFor } from './i18n/localeBundleLoaders'

const LANGUAGE_STORAGE_KEY = 'language'

type BundleLoadResult =
  | { status: 'loaded'; bundle: Record<string, string> }
  // 번역 파일이 아직 없는 언어 (#201 예정) — fallbackLng 문구로 표시하는 정상 케이스
  | { status: 'missing' }
  // loader 는 있었는데 청크 fetch/파싱이 실패한 케이스 — 진짜 실패
  | { status: 'failed'; error: unknown }

async function fetchBundle(lng: string): Promise<BundleLoadResult> {
  const loader = loaderFor(lng)
  if (!loader) return { status: 'missing' }
  try {
    return { status: 'loaded', bundle: (await loader()).default }
  } catch (error) {
    console.error(`[i18n] locale bundle 로드 실패: lng=${lng}`, error)
    return { status: 'failed', error }
  }
}

async function ensureBundle(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, 'translation')) return
  const result = await fetchBundle(lng)
  if (result.status === 'loaded') {
    i18n.addResourceBundle(lng, 'translation', result.bundle, true, true)
  } else if (result.status === 'failed') {
    throw result.error
  }
  // missing: 조용히 통과 — fallbackLng 문구로 표시된다
}

/**
 * 리소스를 확보한 뒤 언어를 전환한다. 번역 파일이 아직 없으면 fallbackLng 문구로 표시된다.
 * 파일이 있는데 로드 자체가 실패하면(청크 fetch 실패 등) reject 한다 — 호출부가 실패를 구분해 대응하도록.
 */
export async function loadLanguage(lng: string): Promise<void> {
  await ensureBundle(lng)
  await i18n.changeLanguage(lng)
}

export function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeLanguage(lng: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
  } catch {
    // private mode 등에서 저장 실패 — 이번 세션 언어만 유지된다
  }
}

function systemLanguages(): string[] {
  if (typeof navigator === 'undefined') return []
  return [...(navigator.languages ?? []), navigator.language].filter(Boolean) as string[]
}

export async function initI18n(): Promise<void> {
  const initial = resolveLanguage(readStoredLanguage(), systemLanguages(), SUPPORTED_LANGUAGES)

  const [fallbackResult, initialResult] = await Promise.all([
    fetchBundle(FALLBACK_LANGUAGE),
    initial === FALLBACK_LANGUAGE ? Promise.resolve<BundleLoadResult>({ status: 'missing' }) : fetchBundle(initial),
  ])
  const fallbackBundle = fallbackResult.status === 'loaded' ? fallbackResult.bundle : null
  const initialBundle = initialResult.status === 'loaded' ? initialResult.bundle : null

  await i18n.use(initReactI18next).init({
    resources: {
      ...(fallbackBundle ? { [FALLBACK_LANGUAGE]: { translation: fallbackBundle } } : {}),
      ...(initialBundle ? { [initial]: { translation: initialBundle } } : {}),
    },
    lng: initial,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: { escapeValue: false },
  })
}

export default i18n
