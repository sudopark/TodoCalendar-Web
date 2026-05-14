import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScopeList } from '../../../src/components/OAuthConsent/ScopeList'
import '../../../src/i18n'

describe('ScopeList', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { warnSpy.mockRestore() })

  it('알려진 scope 코드는 i18n 라벨로 표시한다', () => {
    render(<ScopeList scopes={['read:calendar', 'write:calendar']} />)
    expect(screen.getByText(/캘린더 데이터 조회/)).toBeInTheDocument()
    expect(screen.getByText(/캘린더 작성·수정·삭제/)).toBeInTheDocument()
  })

  it('알 수 없는 scope 는 raw code 폴백 + 콘솔 경고', () => {
    render(<ScopeList scopes={['unknown:scope']} />)
    expect(screen.getByText(/unknown:scope/)).toBeInTheDocument()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('scope 항목은 list semantics 를 가진다 (스크린리더)', () => {
    render(<ScopeList scopes={['read:calendar']} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBe(1)
  })
})
