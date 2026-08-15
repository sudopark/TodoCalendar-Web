import { PUBLIC_DOCS, type DocLanguage } from '../../domain/publicDocs'

export type DocLinkTarget =
  | { kind: 'internal'; to: string }
  | { kind: 'anchor'; href: string }
  | { kind: 'external'; href: string }

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * 원문 md 는 레포 안에서 서로를 `./privacy.md` 같은 상대 경로로 참조한다.
 * 앱에서는 그 경로가 존재하지 않으므로 같은 언어의 앱 라우트로 바꿔 준다.
 */
export function rewriteDocLink(href: string | undefined, lang: DocLanguage): DocLinkTarget {
  if (!href) return { kind: 'external', href: '' }
  if (href.startsWith('#')) return { kind: 'anchor', href }
  if (HAS_SCHEME.test(href)) return { kind: 'external', href }

  const fileName = href.split(/[?#]/)[0].split('/').pop() ?? ''
  const doc = PUBLIC_DOCS.find(d => d.fileName === fileName)
  if (doc) return { kind: 'internal', to: `/${doc.id}/${lang}` }

  return { kind: 'external', href }
}
