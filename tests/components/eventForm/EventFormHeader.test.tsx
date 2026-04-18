import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventFormHeader } from '../../../src/components/eventForm/EventFormHeader'

function defaultProps(overrides: Partial<React.ComponentProps<typeof EventFormHeader>> = {}) {
  return {
    name: '',
    onNameChange: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
    onCopy: vi.fn(),
    saveDisabled: false,
    idPrefix: 'schedule' as const,
    ...overrides,
  }
}

describe('EventFormHeader', () => {
  it('이름 prop이 주어지면 이름 입력 필드에 값이 표시된다', () => {
    // given / when
    render(<EventFormHeader {...defaultProps({ name: '테스트 일정' })} />)

    // then
    expect(screen.getByDisplayValue('테스트 일정')).toBeInTheDocument()
  })

  it('저장 / 취소(닫기) / 더보기 버튼이 렌더된다', () => {
    // given / when
    render(<EventFormHeader {...defaultProps()} />)

    // then
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument()
  })

  it('saveDisabled=true 이면 저장 버튼이 비활성이다', () => {
    // given / when
    render(<EventFormHeader {...defaultProps({ saveDisabled: true })} />)

    // then
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('이름 입력 필드에 텍스트를 입력하면 onNameChange가 호출된다', async () => {
    // given
    const onNameChange = vi.fn()
    render(<EventFormHeader {...defaultProps({ onNameChange })} />)

    // when
    await userEvent.type(screen.getByLabelText('이름'), 'A')

    // then
    expect(onNameChange).toHaveBeenCalled()
  })

  it('취소 버튼을 클릭하면 onClose가 호출된다', async () => {
    // given
    const onClose = vi.fn()
    render(<EventFormHeader {...defaultProps({ onClose })} />)

    // when
    await userEvent.click(screen.getByRole('button', { name: '취소' }))

    // then
    expect(onClose).toHaveBeenCalled()
  })

  it('저장 버튼을 클릭하면 onSave가 호출된다', async () => {
    // given
    const onSave = vi.fn()
    render(<EventFormHeader {...defaultProps({ onSave })} />)

    // when
    await userEvent.click(screen.getByRole('button', { name: '저장' }))

    // then
    expect(onSave).toHaveBeenCalled()
  })

  it('더보기 > 복제 메뉴를 클릭하면 onCopy가 호출된다', async () => {
    // given
    const onCopy = vi.fn()
    render(<EventFormHeader {...defaultProps({ onCopy })} />)

    // when
    await userEvent.click(screen.getByRole('button', { name: '더보기' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '복제' }))

    // then
    expect(onCopy).toHaveBeenCalled()
  })
})
