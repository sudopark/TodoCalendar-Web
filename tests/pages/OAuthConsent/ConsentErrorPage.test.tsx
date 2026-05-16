import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConsentErrorPage } from '../../../src/pages/OAuthConsent/ConsentErrorPage'
import '../../../src/i18n'

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/oauth/consent/error" element={<ConsentErrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ConsentErrorPage', () => {
  it('reason=invalid_challenge → 매핑된 안내', () => {
    renderAt('/oauth/consent/error?reason=invalid_challenge')
    expect(screen.getByText(/이미 처리됐거나 만료된/)).toBeInTheDocument()
  })

  it('reason 없음 → fallback 안내', () => {
    renderAt('/oauth/consent/error')
    expect(screen.getByText(/오류가 발생했어요/)).toBeInTheDocument()
  })

  it('whitelist 외 reason → fallback (raw 노출 X)', () => {
    renderAt('/oauth/consent/error?reason=foo')
    expect(screen.queryByText(/foo/)).not.toBeInTheDocument()
    expect(screen.getByText(/오류가 발생했어요/)).toBeInTheDocument()
  })
})
