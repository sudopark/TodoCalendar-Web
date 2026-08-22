export const DOC_LANGUAGES = ['ko', 'en'] as const
export type DocLanguage = (typeof DOC_LANGUAGES)[number]

export const FALLBACK_DOC_LANGUAGE: DocLanguage = 'en'

export interface PublicDoc {
  /** 라우트 경로이자 캐시 키 — `/terms`, `/guide` */
  readonly id: string
  /** 원문 레포 기준 md 경로. `{lang}` 은 언어 코드로, `{page}` 는 하위 문서 slug 로 치환된다. */
  readonly pathTemplate: string
  /** `{page}` 를 쓰는 다중 페이지 문서에서 목차에 해당하는 slug. */
  readonly indexPage?: string
  /** 원문 레포에 실제로 존재하는 언어. 문서마다 다르다. */
  readonly languages: readonly DocLanguage[]
  /**
   * 상단 언어 전환 노출 여부. 약관류는 앱 밖(스토어·OAuth 동의 화면)에서 유입돼
   * 독자의 언어가 앱 설정과 다를 수 있어 직접 고를 수 있어야 한다.
   */
  readonly showsLanguageSwitch: boolean
  readonly title: string
  /** 번역된 제목이 있는 문서만 갖는다. 있으면 title 보다 우선한다. */
  readonly titleKey?: string
}

export const PUBLIC_DOCS: readonly PublicDoc[] = [
  {
    id: 'terms',
    pathTemplate: '{lang}/terms.md',
    languages: DOC_LANGUAGES,
    showsLanguageSwitch: true,
    title: 'Terms of Use',
    titleKey: 'publicDoc.terms.title',
  },
  {
    id: 'privacy',
    pathTemplate: '{lang}/privacy.md',
    languages: DOC_LANGUAGES,
    showsLanguageSwitch: true,
    title: 'Privacy Policy',
    titleKey: 'publicDoc.privacy.title',
  },
  {
    id: 'google-calendar-data',
    pathTemplate: '{lang}/google-calendar-data.md',
    languages: ['en'],
    showsLanguageSwitch: true,
    title: 'Google Calendar Integration & Data Policy',
  },
  {
    id: 'guide',
    pathTemplate: 'guide/{lang}/{page}.md',
    indexPage: 'README',
    languages: DOC_LANGUAGES,
    showsLanguageSwitch: false,
    title: 'Guide',
  },
]

export function findPublicDoc(id: string | undefined): PublicDoc | undefined {
  return PUBLIC_DOCS.find(d => d.id === id)
}

export function isMultiPageDoc(doc: PublicDoc): boolean {
  return doc.pathTemplate.includes('{page}')
}

/** 단일 페이지 문서의 md 파일명. 다중 페이지 문서는 파일명이 하나로 정해지지 않아 undefined. */
export function docFileName(doc: PublicDoc): string | undefined {
  if (isMultiPageDoc(doc)) return undefined
  return doc.pathTemplate.split('/').pop()
}

export function docFilePath(doc: PublicDoc, lang: DocLanguage, page?: string): string {
  return doc.pathTemplate
    .replace('{lang}', lang)
    .replace('{page}', page ?? doc.indexPage ?? '')
}

/** URL 세그먼트가 그대로 원문 레포 경로에 들어가므로 상위 경로 탈출을 막는다. */
export function isValidDocPage(page: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(page) && !page.includes('..')
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
