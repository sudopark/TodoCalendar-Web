export const DOC_LANGUAGES = ['ko', 'en'] as const
export type DocLanguage = (typeof DOC_LANGUAGES)[number]

export const FALLBACK_DOC_LANGUAGE: DocLanguage = 'en'

export interface PublicDoc {
  /** 라우트 경로이자 캐시 키 — `/terms`, `/privacy` */
  readonly id: string
  readonly fileName: string
  readonly titleKey: string
}

export const PUBLIC_DOCS: readonly PublicDoc[] = [
  { id: 'terms', fileName: 'terms.md', titleKey: 'publicDoc.terms.title' },
  { id: 'privacy', fileName: 'privacy.md', titleKey: 'publicDoc.privacy.title' },
]

export function findPublicDoc(id: string | undefined): PublicDoc | undefined {
  return PUBLIC_DOCS.find(d => d.id === id)
}

export function isDocLanguage(value: unknown): value is DocLanguage {
  return typeof value === 'string' && (DOC_LANGUAGES as readonly string[]).includes(value)
}

/** UI 언어 31개를 문서가 실제로 존재하는 ko/en 2벌로 clamp 한다. */
export function resolveDocLanguage(uiLanguage: string | undefined | null): DocLanguage {
  return uiLanguage?.toLowerCase().startsWith('ko') ? 'ko' : FALLBACK_DOC_LANGUAGE
}
