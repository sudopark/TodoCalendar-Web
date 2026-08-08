import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from './i18n/supportedLanguages'
import { resolveLanguage, FALLBACK_LANGUAGE } from './i18n/resolveLanguage'

const LANGUAGE_STORAGE_KEY = 'language'

const loaders = import.meta.glob('./locales/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, string> }>
>

function loaderFor(lng: string) {
  return loaders[`./locales/${lng}.json`]
}

async function fetchBundle(lng: string): Promise<Record<string, string> | null> {
  const loader = loaderFor(lng)
  if (!loader) return null
  try {
    return (await loader()).default
  } catch {
    return null
  }
}

async function ensureBundle(lng: string): Promise<void> {
  if (i18n.hasResourceBundle(lng, 'translation')) return
  const bundle = await fetchBundle(lng)
  if (bundle) i18n.addResourceBundle(lng, 'translation', bundle, true, true)
}

/** 리소스를 확보한 뒤 언어를 전환한다. 번역 파일이 없으면 fallbackLng 문구로 표시된다. */
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

  const [fallbackBundle, initialBundle] = await Promise.all([
    fetchBundle(FALLBACK_LANGUAGE),
    initial === FALLBACK_LANGUAGE ? Promise.resolve(null) : fetchBundle(initial),
  ])

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
