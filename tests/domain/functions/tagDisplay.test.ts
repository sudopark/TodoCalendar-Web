import { describe, it, expect } from 'vitest'
import { tagDisplayName } from '../../../src/domain/functions/tagDisplay'
import type { ResolvedTag } from '../../../src/domain/tag/resolveEventTag'
import type { TFunction } from 'i18next'

const t = ((key: string, fallback?: string) => fallback ?? key) as unknown as TFunction

describe('tagDisplayName', () => {
  it('kind=explicit이면 tag.name을 그대로 반환한다', () => {
    const r: ResolvedTag = { kind: 'explicit', tag: { uuid: 't1', name: 'Work', color_hex: '#f00' }, color: '#f00' }
    expect(tagDisplayName(r, t)).toBe('Work')
  })

  it('kind=default이면 tag.default_name 번역 fallback이 반환된다', () => {
    const r: ResolvedTag = { kind: 'default', color: '#111' }
    expect(tagDisplayName(r, t)).toBe('Default')
  })

  it('kind=holiday이면 tag.holiday_name 번역 fallback이 반환된다', () => {
    const r: ResolvedTag = { kind: 'holiday', color: '#222' }
    expect(tagDisplayName(r, t)).toBe('Holiday')
  })
})
