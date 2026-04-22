import { describe, it, expect } from 'vitest'
import { buildTagRows } from '../../../src/domain/tag/buildTagRows'
import { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../../../src/domain/tag/constants'
import {
  APP_FALLBACK_DEFAULT_COLOR,
  APP_FALLBACK_HOLIDAY_COLOR,
} from '../../../src/domain/tag/resolveEventTag'
import type { EventTag } from '../../../src/models'

const t = (key: string, fallback?: string) => fallback ?? key

describe('buildTagRows', () => {
  it('서버에서 내려준 default/holiday 색상과 유저 태그들이 주어지면 Default → Holiday → user tags 순서로 반환한다', () => {
    const tags = new Map<string, EventTag>([
      ['tag-a', { uuid: 'tag-a', name: 'Work', color_hex: '#ff0000' }],
      ['tag-b', { uuid: 'tag-b', name: 'Personal', color_hex: '#00ff00' }],
    ])

    const rows = buildTagRows(tags, { default: '#1111aa', holiday: '#cc0033' }, t)

    expect(rows.map(r => r.id)).toEqual([DEFAULT_TAG_ID, HOLIDAY_TAG_ID, 'tag-a', 'tag-b'])
    expect(rows[0]).toEqual({ id: DEFAULT_TAG_ID, kind: 'default', name: '기본', color: '#1111aa' })
    expect(rows[1]).toEqual({ id: HOLIDAY_TAG_ID, kind: 'holiday', name: '공휴일', color: '#cc0033' })
    expect(rows[2]).toEqual({ id: 'tag-a', kind: 'custom', name: 'Work', color: '#ff0000' })
  })

  it('defaultColors가 null이면 APP_FALLBACK 색상을 사용한다', () => {
    const rows = buildTagRows(new Map(), null, t)

    expect(rows[0].color).toBe(APP_FALLBACK_DEFAULT_COLOR)
    expect(rows[1].color).toBe(APP_FALLBACK_HOLIDAY_COLOR)
  })

  it('유저 태그의 color_hex가 null/undefined면 default 색상으로 대체한다', () => {
    const tags = new Map<string, EventTag>([
      ['tag-x', { uuid: 'tag-x', name: 'Untinted', color_hex: null }],
    ])

    const rows = buildTagRows(tags, { default: '#123456', holiday: '#abcdef' }, t)

    expect(rows[2].color).toBe('#123456')
  })

  it('유저 태그 중 default/holiday 예약 id와 겹치는 항목은 필터링된다', () => {
    const tags = new Map<string, EventTag>([
      [DEFAULT_TAG_ID, { uuid: DEFAULT_TAG_ID, name: 'dup', color_hex: '#000' }],
      ['tag-1', { uuid: 'tag-1', name: 'Real', color_hex: '#fff' }],
    ])

    const rows = buildTagRows(tags, { default: '#111', holiday: '#222' }, t)

    expect(rows.map(r => r.id)).toEqual([DEFAULT_TAG_ID, HOLIDAY_TAG_ID, 'tag-1'])
  })

  it('i18n translator가 주입되면 Default/Holiday 이름을 로컬라이즈된 문자열로 반환한다', () => {
    const tCustom = (key: string) => (key === 'tag.default_name' ? '기본' : key === 'tag.holiday_name' ? '공휴일' : key)

    const rows = buildTagRows(new Map(), null, tCustom)

    expect(rows[0].name).toBe('기본')
    expect(rows[1].name).toBe('공휴일')
  })
})
