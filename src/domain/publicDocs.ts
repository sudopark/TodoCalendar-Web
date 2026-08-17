export const DOC_LANGUAGES = ['ko', 'en'] as const
export type DocLanguage = (typeof DOC_LANGUAGES)[number]

export const FALLBACK_DOC_LANGUAGE: DocLanguage = 'en'

export interface PublicDoc {
  /** 라우트 경로이자 캐시 키 — `/terms`, `/privacy` */
  readonly id: string
  readonly fileName: string
  /** 원문 레포에 실제로 존재하는 언어. 문서마다 다르다. */
  readonly languages: readonly DocLanguage[]
  readonly title: string
  /** 번역된 제목이 있는 문서만 갖는다. 있으면 title 보다 우선한다. */
  readonly titleKey?: string
}

export const PUBLIC_DOCS: readonly PublicDoc[] = [
  {
    id: 'terms',
    fileName: 'terms.md',
    languages: DOC_LANGUAGES,
    title: 'Terms of Use',
    titleKey: 'publicDoc.terms.title',
  },
  {
    id: 'privacy',
    fileName: 'privacy.md',
    languages: DOC_LANGUAGES,
    title: 'Privacy Policy',
    titleKey: 'publicDoc.privacy.title',
  },
  {
    id: 'google-calendar-data',
    fileName: 'google-calendar-data.md',
    languages: ['en'],
    title: 'Google Calendar Integration & Data Policy',
  },
]

export function findPublicDoc(id: string | undefined): PublicDoc | undefined {
  return PUBLIC_DOCS.find(d => d.id === id)
}

export function isDocLanguage(value: unknown): value is DocLanguage {
  return typeof value === 'string' && (DOC_LANGUAGES as readonly string[]).includes(value)
}

export function isSupportedDocLanguage(doc: PublicDoc, value: unknown): value is DocLanguage {
  return isDocLanguage(value) && doc.languages.includes(value)
}

/** UI 언어 31개를 그 문서가 실제로 제공하는 언어로 clamp 한다. */
export function resolveDocLanguage(
  doc: PublicDoc,
  uiLanguage: string | undefined | null
): DocLanguage {
  const preferred: DocLanguage =
    typeof uiLanguage === 'string' && uiLanguage.toLowerCase().startsWith('ko')
      ? 'ko'
      : FALLBACK_DOC_LANGUAGE
  if (doc.languages.includes(preferred)) return preferred
  return doc.languages[0] ?? FALLBACK_DOC_LANGUAGE
}
