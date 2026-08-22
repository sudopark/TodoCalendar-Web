export interface PublicDocApi {
  fetchMarkdown(filePath: string): Promise<string>
  sourceUrl(filePath: string): string
}

// apiClient 를 타지 않는다 — 인증이 필요 없는 공개 리소스이고, 401 로 로그아웃이 걸리면 안 된다.
export function createPublicDocApi(baseUrl: string): PublicDocApi {
  const root = baseUrl.replace(/\/+$/, '')
  const sourceUrl = (filePath: string) => `${root}/${filePath.replace(/^\/+/, '')}`

  return {
    sourceUrl,
    async fetchMarkdown(filePath) {
      const res = await fetch(sourceUrl(filePath))
      if (!res.ok) {
        throw new Error(`공개 문서 조회 실패: ${filePath} (${res.status})`)
      }
      return res.text()
    },
  }
}
