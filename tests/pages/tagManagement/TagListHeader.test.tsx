import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagListHeader } from '../../../src/pages/tagManagement/components/TagListHeader'

describe('TagListHeader', () => {
  it('"이벤트 종류" 제목과 추가/닫기 버튼이 표시된다', () => {
    render(<TagListHeader onCreate={() => {}} onClose={() => {}} />)

    expect(screen.getByRole('heading', { name: /이벤트 종류|Event Types/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /새 태그 추가|Add new tag/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /태그 관리 닫기|Close tag manager/ })).toBeInTheDocument()
  })

  it('"+" 버튼 클릭 시 onCreate 콜백이 호출된다', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<TagListHeader onCreate={onCreate} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: /새 태그 추가|Add new tag/ }))

    expect(onCreate).toHaveBeenCalled()
  })

  it('"X" 버튼 클릭 시 onClose 콜백이 호출된다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TagListHeader onCreate={() => {}} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /태그 관리 닫기|Close tag manager/ }))

    expect(onClose).toHaveBeenCalled()
  })
})
