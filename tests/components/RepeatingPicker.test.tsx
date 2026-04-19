import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingPicker } from '../../src/components/RepeatingPicker'

// 1743375600 = 2025-03-31 00:00:00 KST (월요일)

describe('RepeatingPicker', () => {
  it('기본값은 요약 버튼에 "반복 안 함"으로 표시된다', () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('반복 안 함')
  })

  it('요약 버튼 클릭 시 반복 유형 메뉴가 열린다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '매일' })).toBeInTheDocument()
  })

  it('메뉴는 iOS 앱과 같은 프리셋 항목들을 노출한다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    // 시작일이 2025-03-31 월요일 → 동적 프리셋
    expect(screen.getByRole('menuitem', { name: '매일' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '매주 월요일' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '2주마다 월요일' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '매월 31일' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '매년 3월 31일' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '음력 매년 3월 31일' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '주중 (월–금)' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '매월 마지막 월요일' })).toBeInTheDocument()
  })

  it('메뉴에서 항목을 선택하면 해당 유형으로 onChange가 호출된다', async () => {
    const onChange = vi.fn()
    render(<RepeatingPicker value={null} onChange={onChange} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '매일' }))
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.option.optionType).toBe('every_day')
  })

  it('기존 반복 값이 있으면 요약 버튼에 해당 프리셋 텍스트가 표시된다', () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('매일')
  })

  it('프리셋에 매칭되지 않는 값이면 요약 버튼에 "사용자 정의"가 표시된다', () => {
    // interval=7로 프리셋 범위 벗어남
    const value = {
      start: 1743375600,
      option: { optionType: 'every_week' as const, interval: 7, dayOfWeek: [1], timeZone: 'Asia/Seoul' },
    }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('사용자 정의')
  })

  it('반복 값이 있으면 종료 조건 select가 노출된다', () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('combobox', { name: /종료/ })).toBeInTheDocument()
  })

  it('종료 조건을 "날짜 지정"으로 바꾸면 date input이 노출되고 onChange가 end와 함께 호출된다', async () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } }
    const onChange = vi.fn()
    render(<RepeatingPicker value={value} onChange={onChange} startTimestamp={1743375600} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /종료/ }), 'date')
    expect(screen.getByLabelText('종료 날짜')).toBeInTheDocument()
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(typeof last.end).toBe('number')
  })
})
