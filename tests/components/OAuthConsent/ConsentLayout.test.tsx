import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConsentLayout } from '../../../src/components/OAuthConsent/ConsentLayout'

describe('ConsentLayout', () => {
  it('header / body / actions 슬롯을 모두 렌더한다', () => {
    render(
      <ConsentLayout
        header={<div data-testid="h">권한 요청</div>}
        body={<div data-testid="b">본문</div>}
        actions={<div data-testid="a">버튼</div>}
      />
    )
    expect(screen.getByTestId('h')).toBeInTheDocument()
    expect(screen.getByTestId('b')).toBeInTheDocument()
    expect(screen.getByTestId('a')).toBeInTheDocument()
  })

  it('main 영역에 role 이 있다 (스크린리더 진입점)', () => {
    render(<ConsentLayout header={null} body={<div>x</div>} actions={null} />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('상단에 TodoCalendar wordmark 가 표시된다 (외부 사용자 신뢰 시그널)', () => {
    render(<ConsentLayout header={null} body={<div>x</div>} actions={null} />)
    expect(screen.getByText('TodoCalendar')).toBeInTheDocument()
  })
})
