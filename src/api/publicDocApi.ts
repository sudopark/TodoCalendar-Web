import type { DocLanguage } from '../domain/publicDocs'

export interface PublicDocApi {
  fetchMarkdown(fileName: string, lang: DocLanguage): Promise<string>
  sourceUrl(fileName: string, lang: DocLanguage): string
}

// apiClient 를 타지 않는다 — 인증이 필요 없는 공개 리소스이고, 401 로 로그아웃이 걸리면 안 된다.
export function createPublicDocApi(baseUrl: string): PublicDocApi {
  const root = baseUrl.replace(/\/+$/, '')
  const sourceUrl = (fileName: string, lang: DocLanguage) => `${root}/${lang}/${fileName}`

  return {
    sourceUrl,
    async fetchMarkdown(fileName, lang) {
      const res = await fetch(sourceUrl(fileName, lang))
      if (!res.ok) {
        throw new Error(`공개 문서 조회 실패: ${lang}/${fileName} (${res.status})`)
      }
      return res.text()
    },
  }
}
