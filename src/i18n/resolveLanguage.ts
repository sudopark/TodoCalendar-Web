import { SUPPORTED_LANGUAGES } from './supportedLanguages'

export const FALLBACK_LANGUAGE = 'en'

/** 지원 코드로 직결되지 않는 시스템 태그를 흡수하는 규칙 (소문자 비교) */
const EXPLICIT_ALIASES: Record<string, string> = {
  pt: 'pt-BR',
  'pt-pt': 'pt-BR',
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  no: 'nb',
  nn: 'nb',
  in: 'id',
  iw: 'he',
}

function matchOne(tag: string, supported: readonly string[]): string | null {
  const lower = tag.toLowerCase()

  const exact = supported.find(s => s.toLowerCase() === lower)
  if (exact) return exact

  const aliased = EXPLICIT_ALIASES[lower]
  if (aliased && supported.includes(aliased)) return aliased

  // zh-Hans-CN / zh-Hant-TW 처럼 스크립트가 박힌 태그
  if (lower.startsWith('zh-hans')) return supported.includes('zh-Hans') ? 'zh-Hans' : null
  if (lower.startsWith('zh-hant')) return supported.includes('zh-Hant') ? 'zh-Hant' : null

  // 그 외 xx-YY -> xx
  const base = lower.split('-')[0]
  if (base !== lower) {
    const byAlias = EXPLICIT_ALIASES[base]
    if (byAlias && supported.includes(byAlias)) return byAlias
    const byBase = supported.find(s => s.toLowerCase() === base)
    if (byBase) return byBase
  }

  return null
}

/**
 * 초기 언어 결정 — 저장된 사용자 선택 > 시스템 선호 언어 > en.
 * i18n 인스턴스나 localStorage 를 참조하지 않는 순수 함수.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  navigatorLangs: readonly string[],
  supported: readonly string[] = SUPPORTED_LANGUAGES,
): string {
  if (stored) {
    const fromStored = matchOne(stored, supported)
    if (fromStored) return fromStored
  }

  for (const tag of navigatorLangs) {
    const matched = matchOne(tag, supported)
    if (matched) return matched
  }

  return FALLBACK_LANGUAGE
}
