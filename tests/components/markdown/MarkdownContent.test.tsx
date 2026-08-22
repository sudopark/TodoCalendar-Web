import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarkdownContent } from '../../../src/components/markdown/MarkdownContent'
import { PUBLIC_DOCS } from '../../../src/domain/publicDocs'

const GUIDE = PUBLIC_DOCS.find(d => d.id === 'guide')!

function renderMarkdown(markdown: string) {
  render(
    <MemoryRouter>
      <MarkdownContent markdown={markdown} lang="ko" />
    </MemoryRouter>
  )
}

function renderGuideMarkdown(markdown: string) {
  render(
    <MemoryRouter>
      <MarkdownContent markdown={markdown} lang="ko" doc={GUIDE} />
    </MemoryRouter>
  )
}

describe('MarkdownContent', () => {
  it('마크다운 제목과 목록이 의미 있는 태그로 렌더된다', () => {
    // given / when
    renderMarkdown('# 이용약관\n\n- 첫 항목\n- 둘째 항목')

    // then
    expect(screen.getByRole('heading', { level: 1, name: '이용약관' })).toBeInTheDocument()
    expect(screen.getByText('첫 항목')).toBeInTheDocument()
    expect(screen.getByText('둘째 항목')).toBeInTheDocument()
  })

  it('GFM 표가 표 구조로 렌더된다', () => {
    // given / when
    renderMarkdown('| 항목 | 값 |\n| --- | --- |\n| 보관기간 | 3년 |')

    // then
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '3년' })).toBeInTheDocument()
  })

  it('다른 공개 문서를 가리키는 상대 링크는 같은 언어의 앱 경로를 가리킨다', () => {
    // given / when
    renderMarkdown('[개인정보처리방침](./privacy.md)')

    // then
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/privacy/ko')
  })

  it('외부 링크는 새 탭으로 열리고 referrer 를 넘기지 않는다', () => {
    // given / when
    renderMarkdown('[문의](https://example.com)')

    // then
    const link = screen.getByRole('link', { name: '문의' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('raw HTML 로 넣은 스크린샷이 원문 크기·대체텍스트 그대로 렌더된다', () => {
    // given / when
    renderMarkdown('<img src="https://img.example.test/calendar.png" alt="캘린더" width="280">')

    // then
    const image = screen.getByRole('img', { name: '캘린더' })
    expect(image).toHaveAttribute('src', 'https://img.example.test/calendar.png')
    expect(image).toHaveAttribute('width', '280')
  })

  it('이미지에 붙은 이벤트 핸들러는 제거된다', () => {
    // given / when
    renderMarkdown('안전한 본문\n\n<img src="https://img.example.test/a.png" alt="a" onerror="alert(1)">')

    // then
    expect(screen.getByText('안전한 본문')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'a' })).not.toHaveAttribute('onerror')
  })

  it('스크립트·iframe 같은 태그는 렌더되지 않는다', () => {
    // given / when
    renderMarkdown('안전한 본문\n\n<script>alert(1)</script>\n\n<iframe src="https://evil.test"></iframe>')

    // then
    expect(screen.getByText('안전한 본문')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('제목에 앵커 id 가 붙어 문서 안 링크로 점프할 수 있다', () => {
    // given / when
    renderMarkdown('## 이벤트 종류와 색\n\n[바로가기](#이벤트-종류와-색)')

    // then
    expect(screen.getByRole('heading', { level: 2, name: '이벤트 종류와 색' })).toHaveAttribute(
      'id',
      '이벤트-종류와-색'
    )
    // href 는 브라우저·react-router 를 거치며 퍼센트 인코딩된다 — 가리키는 앵커가 같은지로 본다
    expect(decodeURIComponent(screen.getByRole('link', { name: '바로가기' }).getAttribute('href')!))
      .toBe('#이벤트-종류와-색')
  })

  it('다중 페이지 문서 안의 형제 문서 링크는 같은 문서의 하위 경로를 가리킨다', () => {
    // given / when
    renderGuideMarkdown('[기본 기능](./01-basics.md)\n\n[목차](./README.md)')

    // then
    expect(screen.getByRole('link', { name: '기본 기능' })).toHaveAttribute('href', '/guide/ko/01-basics')
    expect(screen.getByRole('link', { name: '목차' })).toHaveAttribute('href', '/guide/ko')
  })

  it('형제 문서 링크에 붙은 앵커가 유지된다', () => {
    // given / when
    renderGuideMarkdown('[이벤트 종류](./01-basics.md#이벤트-종류와-색)')

    // then
    expect(decodeURIComponent(screen.getByRole('link', { name: '이벤트 종류' }).getAttribute('href')!))
      .toBe('/guide/ko/01-basics#이벤트-종류와-색')
  })
})
