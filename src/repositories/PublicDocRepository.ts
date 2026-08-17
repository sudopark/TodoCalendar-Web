import type { PublicDocApi } from '../api/publicDocApi'
import { FALLBACK_DOC_LANGUAGE, type DocLanguage, type PublicDoc } from '../domain/publicDocs'

interface Deps {
  api: PublicDocApi
}

export class PublicDocRepository {
  private readonly api: PublicDocApi
  private readonly cache = new Map<string, string>()

  constructor({ api }: Deps) {
    this.api = api
  }

  async loadDoc(doc: PublicDoc, lang: DocLanguage): Promise<string> {
    const key = `${doc.id}:${lang}`
    const cached = this.cache.get(key)
    if (cached !== undefined) return cached

    const { markdown, servedLang } = await this.fetchWithEnglishFallback(doc, lang)
    // 폴백으로 받은 본문은 실제로 서빙된 언어 키에만 캐시한다 — 요청 언어 키를 비워 두면
    // 다음 요청(재시도·재진입)이 원래 언어로 다시 시도해 자동 회복된다.
    this.cache.set(`${doc.id}:${servedLang}`, markdown)
    return markdown
  }

  sourceUrl(doc: PublicDoc, lang: DocLanguage): string {
    return this.api.sourceUrl(doc.fileName, lang)
  }

  // 법적 고지라 빈 화면보다 원문이 낫다 — 번역본이 없거나 일시 실패하면 en 으로 한 번 더 시도한다.
  private async fetchWithEnglishFallback(
    doc: PublicDoc,
    lang: DocLanguage
  ): Promise<{ markdown: string; servedLang: DocLanguage }> {
    try {
      const markdown = await this.api.fetchMarkdown(doc.fileName, lang)
      return { markdown, servedLang: lang }
    } catch (error) {
      if (lang === FALLBACK_DOC_LANGUAGE) throw error
      const markdown = await this.api.fetchMarkdown(doc.fileName, FALLBACK_DOC_LANGUAGE)
      return { markdown, servedLang: FALLBACK_DOC_LANGUAGE }
    }
  }
}
