import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventTimePicker } from '../../src/components/EventTimePicker'

describe('EventTimePicker', () => {
  it('required=false이고 value=null이면 "시간 없음" 옵션이 선택된다', () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} required={false} />)
    expect(screen.getByRole('radio', { name: '시간 없음' })).toBeChecked()
  })

  it('"특정 시각" 탭을 선택하면 날짜와 시간 입력 필드가 분리되어 표시된다', async () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: '특정 시각' }))
    // 구글 스타일 — date pill + time pill 분리
    expect(screen.getByLabelText('시작 날짜')).toBeInTheDocument()
    expect(screen.getByLabelText('시작 시간')).toBeInTheDocument()
  })

  it('"기간" 탭을 선택하면 시작/종료 각각 날짜와 시간 pill이 분리되어 표시된다', async () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: '기간' }))
    expect(screen.getByLabelText('시작 날짜')).toBeInTheDocument()
    expect(screen.getByLabelText('시작 시간')).toBeInTheDocument()
    expect(screen.getByLabelText('종료 시간')).toBeInTheDocument()
    expect(screen.getByLabelText('종료 날짜')).toBeInTheDocument()
  })

  it('"종일" 체크박스를 선택하면 날짜만 있는 시작/종료 필드가 표시된다', async () => {
    // given: required=true 상태로 진입해 초기 type='at'에서 종일 토글
    render(<EventTimePicker value={null} onChange={vi.fn()} required={true} />)
    // when
    await userEvent.click(screen.getByRole('checkbox', { name: '종일' }))
    // then: 시작/종료 날짜만 노출, 시간 입력은 숨김
    expect(screen.getByLabelText('시작 날짜')).toBeInTheDocument()
    expect(screen.getByLabelText('종료 날짜')).toBeInTheDocument()
    expect(screen.queryByLabelText('시작 시간')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('종료 시간')).not.toBeInTheDocument()
  })

  it('"종일" 체크를 해제하면 직전 시간 유형으로 복원된다', async () => {
    // given: 초기 type='at' (required)
    render(<EventTimePicker value={null} onChange={vi.fn()} required={true} />)
    await userEvent.click(screen.getByRole('checkbox', { name: '종일' }))
    // allday는 시간 입력이 없음
    expect(screen.queryByLabelText('시작 시간')).not.toBeInTheDocument()
    // when: 종일 해제
    await userEvent.click(screen.getByRole('checkbox', { name: '종일' }))
    // then: 직전 유형(시점)의 시간 입력이 복원됨
    expect(screen.getByLabelText('시작 시간')).toBeInTheDocument()
  })

  it('기존 at 값이 있으면 "특정 시각" 타입으로 초기화된다', () => {
    const value = { time_type: 'at' as const, timestamp: 1743375600 }
    render(<EventTimePicker value={value} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '특정 시각' })).toBeChecked()
    expect(screen.getByLabelText('시작 날짜')).toBeInTheDocument()
    expect(screen.getByLabelText('시작 시간')).toBeInTheDocument()
  })

  it('기존 period 값이 있으면 "기간" 타입으로 초기화된다', () => {
    const value = { time_type: 'period' as const, period_start: 1743375600, period_end: 1743379200 }
    render(<EventTimePicker value={value} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '기간' })).toBeChecked()
  })

  it('"기간" 선택 시 시작/종료 사이에 "부터" 구분자가 노출된다', async () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('radio', { name: '기간' }))
    // ko locale의 "부터" (en은 "to")
    expect(screen.getByText('부터')).toBeInTheDocument()
  })

  it('required=true이면 "시간 없음" 옵션이 표시되지 않는다', () => {
    render(<EventTimePicker value={null} onChange={vi.fn()} required={true} />)
    expect(screen.queryByRole('radio', { name: '시간 없음' })).not.toBeInTheDocument()
  })

  it('시간이 설정된 상태에서는 현재 타임존 정보(GMT 오프셋 + 지역명)가 텍스트로 노출된다', () => {
    // given: 테스트 환경 TZ=Asia/Seoul
    // when: required=true이면 초기 time_type이 'at'으로 잡혀 시간이 설정된 상태
    render(<EventTimePicker value={null} onChange={vi.fn()} required={true} />)
    // then: 시안의 "(GMT+09:00) Korean Standard Time - Seoul" 형식 노출
    expect(screen.getByText(/GMT\+09:00/)).toBeInTheDocument()
    expect(screen.getByText(/Seoul/)).toBeInTheDocument()
  })

  it('"시간 없음" 상태에서는 타임존 정보를 숨긴다', () => {
    // given/when: value=null, required=false → type='none'
    render(<EventTimePicker value={null} onChange={vi.fn()} required={false} />)
    // then: 시간이 설정되지 않은 상태이므로 타임존 의미 없음, 숨김
    expect(screen.queryByText(/GMT/)).not.toBeInTheDocument()
  })
})

describe('EventTimePicker — period 입력 상호작용', () => {
  const KST = '+09:00'
  const toTs = (iso: string) => Math.floor(new Date(iso + KST).getTime() / 1000)

  it('시작 시간을 변경하면 종료와의 duration이 유지된다', () => {
    // given: 5/3 15:30 ~ 16:30 (1시간 duration)
    const start = toTs('2026-05-03T15:30:00')
    const end = start + 3600
    const onChange = vi.fn()
    render(<EventTimePicker value={{ time_type: 'period', period_start: start, period_end: end }} onChange={onChange} />)

    // when: 시작 시간을 17:00으로 변경
    fireEvent.change(screen.getByLabelText('시작 시간'), { target: { value: '17:00' } })

    // then: 종료도 18:00으로 이동해 duration 1시간 유지
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.period_start).toBe(toTs('2026-05-03T17:00:00'))
    expect(last.period_end - last.period_start).toBe(3600)
  })

  it('종료 시간을 시작 이전 시간으로 변경하면 다음 날로 자동 이동한다', () => {
    // given: 5/3 15:30 ~ 16:30
    const start = toTs('2026-05-03T15:30:00')
    const end = start + 3600
    const onChange = vi.fn()
    render(<EventTimePicker value={{ time_type: 'period', period_start: start, period_end: end }} onChange={onChange} />)

    // when: 종료 시간 10:00 (같은 날 기준 시작보다 이전)
    fireEvent.change(screen.getByLabelText('종료 시간'), { target: { value: '10:00' } })

    // then: 종료가 다음 날(5/4) 10:00으로 이동 (silent fail 금지, 사용자 입력 존중)
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.period_end).toBe(toTs('2026-05-04T10:00:00'))
  })

  it('시작 날짜를 변경하면 종료와의 duration이 유지된다', () => {
    // given: 5/3 15:30 ~ 5/3 18:30 (3시간 duration)
    const start = toTs('2026-05-03T15:30:00')
    const end = start + 3 * 3600
    const onChange = vi.fn()
    render(<EventTimePicker value={{ time_type: 'period', period_start: start, period_end: end }} onChange={onChange} />)

    // when: 시작 날짜를 5/5로 변경
    fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-05-05' } })

    // then: 종료도 5/5로 이동하고 duration 3시간 유지
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last.period_end - last.period_start).toBe(3 * 3600)
  })
})
