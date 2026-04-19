import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingPicker } from '../../src/components/RepeatingPicker'

describe('RepeatingPicker', () => {
  it('기본값은 요약 버튼에 "반복 안 함"으로 표시된다', () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('반복 안 함')
  })

  it('요약 버튼 클릭 시 반복 유형 메뉴가 열린다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    // 메뉴 + 프리셋 항목 노출
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '매일' })).toBeInTheDocument()
  })

  it('메뉴에서 항목을 선택하면 해당 유형으로 onChange가 호출된다', async () => {
    const onChange = vi.fn()
    render(<RepeatingPicker value={null} onChange={onChange} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '매주' }))
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.option.optionType).toBe('every_week')
  })

  it('기존 반복 값이 있으면 요약 버튼에 해당 유형 텍스트가 표시된다', () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('매일')
  })

  it('interval > 1인 값이면 세부 요약 텍스트가 버튼 옆에 노출된다', () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 3 } }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByText(/3일마다/)).toBeInTheDocument()
  })

  it('종료 날짜가 있으면 세부 요약 텍스트에 "YYYY-MM-DD까지"가 노출된다', () => {
    const value = {
      start: 1743375600,
      option: { optionType: 'every_day' as const, interval: 1 },
      end: Math.floor(new Date('2026-12-31T00:00:00+09:00').getTime() / 1000),
    }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByText(/2026-12-31까지/)).toBeInTheDocument()
  })
})
