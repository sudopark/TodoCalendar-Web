import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { ToastContainer } from '../../src/components/Toast'
import { useToastStore } from '../../src/stores/toastStore'

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('toasts가 비어있으면 아무것도 렌더하지 않는다', () => {
    // when
    const { container } = render(<ToastContainer />)

    // then
    expect(container.innerHTML).toBe('')
  })

  it('toast 항목이 있으면 role="alert"로 렌더된다', () => {
    // given — 실제 i18n 키로 설정 (setup.ts에서 src/i18n를 import해 번역이 동작함)
    useToastStore.setState({
      toasts: [{ id: '1', key: 'error.unknown', type: 'info' }],
    })

    // when
    render(<ToastContainer />)

    // then: t('error.unknown') 번역 결과가 표시됨
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('error 타입이면 data-toast-type="error" 속성이 부착된다', () => {
    // given
    useToastStore.setState({
      toasts: [{ id: '1', key: 'error.unknown', type: 'error' }],
    })

    // when
    render(<ToastContainer />)

    // then
    expect(screen.getByRole('alert')).toHaveAttribute('data-toast-type', 'error')
  })

  it('success 타입이면 data-toast-type="success" 속성이 부착된다', () => {
    // given
    useToastStore.setState({
      toasts: [{ id: '1', key: 'event.created.todo', type: 'success' }],
    })

    // when
    render(<ToastContainer />)

    // then
    expect(screen.getByRole('alert')).toHaveAttribute('data-toast-type', 'success')
  })

  it('클릭하면 해당 toast가 제거된다', async () => {
    // given
    useToastStore.setState({
      toasts: [{ id: '1', key: 'error.unknown', type: 'info' }],
    })
    render(<ToastContainer />)
    const user = userEvent.setup()

    // when
    await user.click(screen.getByRole('alert'))

    // then
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
