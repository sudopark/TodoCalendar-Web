import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepeatingPicker } from '../../src/components/RepeatingPicker'

describe('RepeatingPicker', () => {
  it('기본값은 요약 버튼에 "반복 안 함"으로 표시된다', () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('반복 안 함')
  })

  it('요약 버튼 클릭 시 반복 유형 드롭다운이 열린다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    expect(screen.getByRole('combobox', { name: '반복 유형' })).toBeInTheDocument()
  })

  it('"매주" 선택 시 요일 선택 영역이 표시된다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '반복 유형' }), 'every_week')
    // 월요일 라벨
    expect(screen.getByText('월')).toBeInTheDocument()
  })

  it('"매월" 선택 시 날짜/요일 선택 라디오가 표시된다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '반복 유형' }), 'every_month')
    expect(screen.getByRole('radio', { name: '날짜 지정' })).toBeInTheDocument()
  })

  it('기존 반복 값이 있으면 요약 버튼에 해당 유형 텍스트가 표시된다', () => {
    const value = { start: 1743375600, option: { optionType: 'every_day' as const, interval: 1 } }
    render(<RepeatingPicker value={value} onChange={vi.fn()} startTimestamp={1743375600} />)
    expect(screen.getByRole('button', { name: '반복' })).toHaveTextContent('매일')
  })

  it('종료 날짜 옵션 선택 시 onChange가 호출된다', async () => {
    const onChange = vi.fn()
    render(<RepeatingPicker value={null} onChange={onChange} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    // 반복 유형 "매일" 선택 (onChange 1차 호출로 value 생성)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '반복 유형' }), 'every_day')
    // 종료 조건 "날짜" radio 선택
    await userEvent.click(screen.getByRole('radio', { name: '날짜' }))
    expect(onChange).toHaveBeenCalled()
  })

  it('"매년" 선택 시 월 입력 필드가 표시된다', async () => {
    render(<RepeatingPicker value={null} onChange={vi.fn()} startTimestamp={1743375600} />)
    await userEvent.click(screen.getByRole('button', { name: '반복' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '반복 유형' }), 'every_year')
    expect(screen.getByLabelText('월')).toBeInTheDocument()
  })
})
