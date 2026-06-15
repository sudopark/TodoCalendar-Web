import { describe, it, expect } from 'vitest'
import { withAlpha } from '../../src/utils/color'

describe('withAlpha', () => {
  it('6자리 hex 에 alpha 를 덧붙인다', () => {
    expect(withAlpha('#1976D2', '88')).toBe('#1976D288')
  })

  // #192: iOS 태그는 8자리(#RRGGBBAA). 그냥 이으면 10자리 무효 hex → 배경 투명.
  it('8자리 hex 는 기존 alpha 를 떼고 6자리에 덧붙인다', () => {
    expect(withAlpha('#1976D2FF', '88')).toBe('#1976D288')
    expect(withAlpha('#1976D2FF', '22')).toBe('#1976D222')
  })

  it('hex 가 아니면 원본을 그대로 반환한다', () => {
    expect(withAlpha('rgb(25,118,210)', '88')).toBe('rgb(25,118,210)')
    expect(withAlpha('rebeccapurple', '88')).toBe('rebeccapurple')
  })
})
