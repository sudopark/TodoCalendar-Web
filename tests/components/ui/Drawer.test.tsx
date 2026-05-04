import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer } from '../../../src/components/ui/Drawer'

describe('Drawer', () => {
  it('open=false 이면 콘텐츠를 렌더하지 않는다', () => {
    render(
      <Drawer open={false} onClose={vi.fn()}>
        <p>hidden</p>
      </Drawer>
    )
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })

  it('open=true 이면 콘텐츠와 백드롭을 렌더한다', () => {
    render(
      <Drawer open onClose={vi.fn()}>
        <p>visible</p>
      </Drawer>
    )
    expect(screen.getByText('visible')).toBeInTheDocument()
    expect(screen.getByTestId('drawer-backdrop')).toBeInTheDocument()
  })

  it('백드롭 클릭 시 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>body</p>
      </Drawer>
    )
    await userEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc 키로 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose}>
        <p>body</p>
      </Drawer>
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('open 시 drawer 내부 첫 focusable 요소로 초점이 이동한다', () => {
    render(
      <Drawer open onClose={vi.fn()}>
        <button>first</button>
        <button>second</button>
      </Drawer>
    )
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()
  })
})
