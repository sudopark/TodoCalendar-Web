import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../../src/components/Header'

describe('Header', () => {
  function renderHeader(path = '/') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>
    )
  }

  it('캘린더, 설정 탭 링크를 렌더한다', () => {
    // given / when
    renderHeader('/')

    // then: 현재 헤더에는 캘린더와 설정 탭만 있다
    expect(screen.getByRole('link', { name: '캘린더' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '설정' })).toBeInTheDocument()
  })

  it('/ 경로에서 캘린더 탭이 aria-current="page" 속성을 갖는다', () => {
    // given / when
    renderHeader('/')

    // then: NavLink는 활성 시 aria-current="page"를 자동 부착
    expect(screen.getByRole('link', { name: '캘린더' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '설정' })).not.toHaveAttribute('aria-current')
  })

  it('/settings 경로에서 설정 탭이 aria-current="page" 속성을 갖는다', () => {
    // given / when
    renderHeader('/settings')

    // then: NavLink는 활성 시 aria-current="page"를 자동 부착
    expect(screen.getByRole('link', { name: '설정' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '캘린더' })).not.toHaveAttribute('aria-current')
  })
})
