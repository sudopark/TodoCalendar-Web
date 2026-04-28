import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoreActionsMenu } from '../../../src/components/eventForm/MoreActionsMenu'

describe('MoreActionsMenu', () => {
  it('더보기 버튼을 클릭하면 메뉴가 열리고 "복제" 옵션이 노출된다', async () => {
    // given
    render(<MoreActionsMenu onCopy={vi.fn()} />)

    // when
    await userEvent.click(screen.getByRole('button', { name: '더보기' }))

    // then
    expect(screen.getByRole('menuitem', { name: '복제' })).toBeInTheDocument()
  })

  it('메뉴가 닫혀 있을 때는 "복제" 옵션이 노출되지 않는다', () => {
    // given / when
    render(<MoreActionsMenu onCopy={vi.fn()} />)

    // then
    expect(screen.queryByRole('menuitem', { name: '복제' })).not.toBeInTheDocument()
  })

  it('"복제" 메뉴를 클릭하면 메뉴가 닫힌다', async () => {
    // given
    render(<MoreActionsMenu onCopy={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '더보기' }))

    // when
    await userEvent.click(screen.getByRole('menuitem', { name: '복제' }))

    // then
    expect(screen.queryByRole('menuitem', { name: '복제' })).not.toBeInTheDocument()
  })

  it('메뉴가 열린 상태에서 Escape 키를 누르면 메뉴가 닫힌다', async () => {
    // given
    render(<MoreActionsMenu onCopy={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '더보기' }))
    expect(screen.getByRole('menuitem', { name: '복제' })).toBeInTheDocument()

    // when
    await userEvent.keyboard('{Escape}')

    // then
    expect(screen.queryByRole('menuitem', { name: '복제' })).not.toBeInTheDocument()
  })

  it('버튼이 "더보기" aria-label로 접근 가능하다', () => {
    // given / when
    render(<MoreActionsMenu onCopy={vi.fn()} />)

    // then: 버튼은 aria-label로 "더보기" 접근성 이름을 가진다
    const btn = screen.getByRole('button', { name: '더보기' })
    expect(btn).toBeInTheDocument()
  })
})
