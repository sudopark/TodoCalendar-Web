const H1 = /^#[^\S\n]+(.+?)[^\S\n]*$/m

/** 문서 제목은 본문 첫 h1 이 갖는다 — 브라우저 탭 제목을 여기서 얻는다. */
export function firstHeading(markdown: string): string | undefined {
  return H1.exec(markdown)?.[1]
}
