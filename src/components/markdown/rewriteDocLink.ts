import {
  PUBLIC_DOCS,
  docFileName,
  isMultiPageDoc,
  type DocLanguage,
  type PublicDoc,
} from '../../domain/publicDocs'

export type DocLinkTarget =
  | { kind: 'internal'; to: string }
  | { kind: 'anchor'; href: string }
  | { kind: 'external'; href: string }

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * 원문 md 는 레포 안에서 서로를 `./privacy.md`·`./01-basics.md#앵커` 같은 상대 경로로 참조한다.
 * 앱에서는 그 경로가 존재하지 않으므로 같은 언어의 앱 라우트로 바꿔 준다.
 * `currentDoc` 은 다중 페이지 문서 안에서 형제 문서를 가리키는 링크를 풀 때 쓰인다.
 */
export function rewriteDocLink(
  href: string | undefined,
  lang: DocLanguage,
  currentDoc?: PublicDoc
): DocLinkTarget {
  if (!href) return { kind: 'external', href: '' }
  if (href.startsWith('#')) return { kind: 'anchor', href }
  if (HAS_SCHEME.test(href)) return { kind: 'external', href }

  const suffixAt = href.search(/[?#]/)
  const path = suffixAt === -1 ? href : href.slice(0, suffixAt)
  const suffix = suffixAt === -1 ? '' : href.slice(suffixAt)
  const fileName = path.split('/').pop() ?? ''

  const doc = PUBLIC_DOCS.find(d => docFileName(d) === fileName)
  if (doc) return { kind: 'internal', to: `/${doc.id}/${lang}${suffix}` }

  if (currentDoc && isMultiPageDoc(currentDoc) && fileName.endsWith('.md')) {
    const page = fileName.slice(0, -'.md'.length)
    const base =
      page === currentDoc.indexPage
        ? `/${currentDoc.id}/${lang}`
        : `/${currentDoc.id}/${lang}/${page}`
    return { kind: 'internal', to: `${base}${suffix}` }
  }

  return { kind: 'external', href }
}
