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

  it('버튼에 "더보기" 텍스트가 가시적으로 노출된다', () => {
    // given / when
    render(<MoreActionsMenu onCopy={vi.fn()} />)

    // then: 시안은 "More actions ▾" 텍스트+chevron 스타일. 아이콘만이 아니라 텍스트가 보여야 함
    const btn = screen.getByRole('button', { name: '더보기' })
    expect(btn).toHaveTextContent('더보기')
  })
})
