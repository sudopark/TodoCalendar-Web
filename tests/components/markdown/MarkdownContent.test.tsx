import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarkdownContent } from '../../../src/components/markdown/MarkdownContent'

function renderMarkdown(markdown: string) {
  render(
    <MemoryRouter>
      <MarkdownContent markdown={markdown} lang="ko" />
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

  it('본문에 섞인 raw HTML 은 실행되지 않고 무시된다', () => {
    // given / when
    renderMarkdown('안전한 본문\n\n<img src=x onerror="alert(1)">')

    // then
    expect(screen.getByText('안전한 본문')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })
})
