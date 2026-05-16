import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer } from '../../../src/components/ui/Drawer'

describe('Drawer', () => {
  it('open=false 이면 콘텐츠를 렌더하지 않는다', () => {
    // given / when
    render(
      <Drawer open={false} onClose={vi.fn()}>
        <p>hidden</p>
      </Drawer>
    )

    // then
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })

  it('open=true 이면 콘텐츠와 백드롭을 렌더한다', () => {
    // given / when
    render(
      <Drawer open onClose={vi.fn()}>
        <p>visible</p>
      </Drawer>
    )

    // then
    expect(screen.getByText('visible')).toBeInTheDocument()
    expect(screen.getByTestId('drawer-backdrop')).toBeInTheDocument()
  })

  it('백드롭 클릭 시 onClose가 호출된다', async () => {
    // given
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>body</p>
      </Drawer>
    )

    // when
    await userEvent.click(screen.getByTestId('drawer-backdrop'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc 키로 onClose가 호출된다', async () => {
    // given
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>body</p>
      </Drawer>
    )

    // when
    await userEvent.keyboard('{Escape}')

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('drawer 본문 클릭은 onClose를 호출하지 않는다', async () => {
    // given
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <button>action</button>
      </Drawer>
    )

    // when
    await userEvent.click(screen.getByRole('button', { name: 'action' }))

    // then
    expect(onClose).not.toHaveBeenCalled()
  })

  it('open 시 drawer 내부 첫 focusable 요소로 초점이 이동한다', () => {
    // given / when
    render(
      <Drawer open onClose={vi.fn()}>
        <button>first</button>
        <button>second</button>
      </Drawer>
    )

    // then
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()
  })
})
