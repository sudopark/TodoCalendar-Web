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

    const markdown = await this.fetchWithEnglishFallback(doc, lang)
    this.cache.set(key, markdown)
    return markdown
  }

  sourceUrl(doc: PublicDoc, lang: DocLanguage): string {
    return this.api.sourceUrl(doc.fileName, lang)
  }

  // 법적 고지라 빈 화면보다 원문이 낫다 — 번역본이 없거나 일시 실패하면 en 으로 한 번 더 시도한다.
  private async fetchWithEnglishFallback(doc: PublicDoc, lang: DocLanguage): Promise<string> {
    try {
      return await this.api.fetchMarkdown(doc.fileName, lang)
    } catch (error) {
      if (lang === FALLBACK_DOC_LANGUAGE) throw error
      return this.api.fetchMarkdown(doc.fileName, FALLBACK_DOC_LANGUAGE)
    }
  }
}
