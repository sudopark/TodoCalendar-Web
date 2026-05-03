import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPalette, PRESET_COLORS } from '../../src/components/ColorPalette'

function labelPattern(hex: string) {
  return new RegExp(`색상 선택.*${hex}|Select color.*${hex}`)
}

describe('ColorPalette', () => {
  it('각 프리셋 색상이 aria-label 로 식별 가능한 버튼으로 렌더된다', () => {
    // given / when
    render(<ColorPalette selected={PRESET_COLORS[0]} onChange={() => {}} />)

    // then
    for (const hex of PRESET_COLORS) {
      expect(screen.getByRole('button', { name: labelPattern(hex) })).toBeInTheDocument()
    }
  })

  // iOS 앱의 EventTagDetailViewModelImple.suggestColorHexes 와 동일한 풍부한 팔레트를 제공해야 한다.
  // 8색짜리 빈약한 팔레트(이전 구현)에서는 사용자가 원하는 컬러를 고르기 어렵다는 QA 피드백.
  it('iOS suggestColorHexes 와 동일한 풍부한 팔레트를 제공한다 (대표 색 검증)', () => {
    const required = ['#F42D2D', '#FFA02E', '#F6DC41', '#1E90FF', '#6800f2', '#3CB371', '#FD838F']
    for (const hex of required) {
      expect(PRESET_COLORS).toContain(hex)
    }
  })

  it('선택된 색상 버튼은 aria-pressed="true" 가 되고 그 외는 "false" 다', () => {
    // given / when
    render(<ColorPalette selected="#3CB371" onChange={() => {}} />)

    // then
    expect(screen.getByRole('button', { name: labelPattern('#3CB371') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: labelPattern('#F42D2D') })).toHaveAttribute('aria-pressed', 'false')
  })

  it('모든 버튼은 type="button" 이라 form 내부에서도 submit 을 유발하지 않는다', () => {
    // given / when
    render(<ColorPalette selected={PRESET_COLORS[0]} onChange={() => {}} />)

    // then
    const buttons = screen.getAllByRole('button')
    for (const b of buttons) expect(b).toHaveAttribute('type', 'button')
  })

  it('색상 버튼을 클릭하면 해당 색이 선택 상태로 전환된다', async () => {
    // given — 실제 상태를 가진 Wrapper 로 렌더
    function Wrapper() {
      const [selected, setSelected] = useState('#F42D2D')
      return <ColorPalette selected={selected} onChange={setSelected} />
    }
    const user = userEvent.setup()
    render(<Wrapper />)
    expect(screen.getByRole('button', { name: labelPattern('#F42D2D') })).toHaveAttribute('aria-pressed', 'true')

    // when — 다른 색 클릭
    await user.click(screen.getByRole('button', { name: labelPattern('#3CB371') }))

    // then — 선택 상태가 새 색으로 이동 (사용자 관점 결과)
    expect(screen.getByRole('button', { name: labelPattern('#3CB371') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: labelPattern('#F42D2D') })).toHaveAttribute('aria-pressed', 'false')
  })

  it('custom colors prop 이 주어지면 해당 색상만 렌더한다 (기본 PRESET 무시)', () => {
    // given / when
    render(<ColorPalette colors={['#000000', '#ffffff']} selected="#000000" onChange={() => {}} />)

    // then
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: labelPattern('#000000') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labelPattern('#ffffff') })).toBeInTheDocument()
  })
})
