import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConsentErrorView } from '../../../src/components/OAuthConsent/ConsentErrorView'
import '../../../src/i18n'

function renderView(reason: string | null) {
  render(
    <MemoryRouter>
      <ConsentErrorView reason={reason} />
    </MemoryRouter>
  )
}

describe('ConsentErrorView', () => {
  it('whitelist 의 invalid_challenge → 매핑된 안내 표시', () => {
    renderView('invalid_challenge')
    expect(screen.getByText(/이미 처리됐거나 만료된/)).toBeInTheDocument()
  })

  it('whitelist 외 reason → fallback 안내 표시 (raw 노출 X)', () => {
    renderView('something_unexpected')
    expect(screen.getByText(/오류가 발생했어요/)).toBeInTheDocument()
    expect(screen.queryByText(/something_unexpected/)).not.toBeInTheDocument()
  })

  it('reason 없음(null) → fallback 안내', () => {
    renderView(null)
    expect(screen.getByText(/오류가 발생했어요/)).toBeInTheDocument()
  })

  it('홈으로 링크가 / 로 향한다', () => {
    renderView('invalid_challenge')
    const link = screen.getByRole('link', { name: /홈으로|Go home/i })
    expect(link).toHaveAttribute('href', '/')
  })
})
