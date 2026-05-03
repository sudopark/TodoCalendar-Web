import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteTagDialog } from '../../../../src/pages/settings/tagManagement/DeleteTagDialog'

describe('DeleteTagDialog', () => {
  it('태그 이름이 메시지에 포함되고 두 삭제 옵션 + 취소 버튼이 모두 표시된다', () => {
    // given / when
    render(
      <DeleteTagDialog
        tagName="업무"
        onDeleteTagOnly={() => {}}
        onDeleteTagAndEvents={() => {}}
        onCancel={() => {}}
      />,
    )

    // then
    expect(screen.getByText('태그 삭제')).toBeInTheDocument()
    expect(screen.getByText(/"업무" 태그를 어떻게 삭제할까요?/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '태그만 삭제' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
  })

  it('"태그만 삭제"를 누르면 onDeleteTagOnly 콜백이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onDeleteTagOnly = vi.fn()
    render(
      <DeleteTagDialog
        tagName="T"
        onDeleteTagOnly={onDeleteTagOnly}
        onDeleteTagAndEvents={() => {}}
        onCancel={() => {}}
      />,
    )

    // when
    await user.click(screen.getByRole('button', { name: '태그만 삭제' }))

    // then
    expect(onDeleteTagOnly).toHaveBeenCalled()
  })

  it('"태그 + 연관 이벤트 모두 삭제"를 누르면 onDeleteTagAndEvents 콜백이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onDeleteTagAndEvents = vi.fn()
    render(
      <DeleteTagDialog
        tagName="T"
        onDeleteTagOnly={() => {}}
        onDeleteTagAndEvents={onDeleteTagAndEvents}
        onCancel={() => {}}
      />,
    )

    // when
    await user.click(screen.getByRole('button', { name: '태그 + 연관 이벤트 모두 삭제' }))

    // then
    expect(onDeleteTagAndEvents).toHaveBeenCalled()
  })

  it('"취소" 버튼을 누르면 onCancel 콜백이 호출된다', async () => {
    // given
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <DeleteTagDialog
        tagName="T"
        onDeleteTagOnly={() => {}}
        onDeleteTagAndEvents={() => {}}
        onCancel={onCancel}
      />,
    )

    // when
    await user.click(screen.getByRole('button', { name: '취소' }))

    // then
    expect(onCancel).toHaveBeenCalled()
  })
})
