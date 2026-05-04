import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomSheet } from '../../../src/components/ui/BottomSheet'

describe('BottomSheet', () => {
  it('open=false 이면 콘텐츠를 렌더하지 않는다', () => {
    // given / when
    render(
      <BottomSheet open={false} onClose={vi.fn()}>
        <p>hidden body</p>
      </BottomSheet>
    )

    // then
    expect(screen.queryByText('hidden body')).not.toBeInTheDocument()
  })

  it('open=true 이면 콘텐츠와 백드롭을 렌더한다', () => {
    // given / when
    render(
      <BottomSheet open onClose={vi.fn()}>
        <p>visible body</p>
      </BottomSheet>
    )

    // then
    expect(screen.getByText('visible body')).toBeInTheDocument()
    expect(screen.getByTestId('bottom-sheet-backdrop')).toBeInTheDocument()
  })

  it('백드롭 클릭 시 onClose가 호출된다', async () => {
    // given
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>body</p>
      </BottomSheet>
    )

    // when
    await userEvent.click(screen.getByTestId('bottom-sheet-backdrop'))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('Esc 키로 onClose가 호출된다', async () => {
    // given
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>body</p>
      </BottomSheet>
    )

    // when
    await userEvent.keyboard('{Escape}')

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('시트 본문 클릭은 onClose를 호출하지 않는다', async () => {
    // given
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <button>action</button>
      </BottomSheet>
    )

    // when
    await userEvent.click(screen.getByRole('button', { name: 'action' }))

    // then
    expect(onClose).not.toHaveBeenCalled()
  })

  it('open 시 sheet 내부 첫 focusable 요소로 초점이 이동한다', () => {
    // given / when
    render(
      <BottomSheet open onClose={vi.fn()}>
        <button>first</button>
        <button>second</button>
      </BottomSheet>
    )

    // then
    expect(screen.getByRole('button', { name: 'first' })).toHaveFocus()
  })
})
