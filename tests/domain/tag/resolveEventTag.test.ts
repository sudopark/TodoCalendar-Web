import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})) }))
vi.mock('../../../src/api/eventTagApi', () => ({ eventTagApi: {} }))
vi.mock('../../../src/api/settingApi', () => ({ settingApi: {} }))

import {
  resolveEventTag,
  APP_FALLBACK_DEFAULT_COLOR,
  APP_FALLBACK_HOLIDAY_COLOR,
} from '../../../src/domain/tag/resolveEventTag'
import { DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../../../src/repositories/caches/eventTagListCache'
import type { EventTag, DefaultTagColors } from '../../../src/models'

function ctx(overrides: Partial<{ tags: Map<string, EventTag>; defaultTagId: string | null; defaultColors: DefaultTagColors | null }> = {}) {
  return {
    tags: new Map(),
    defaultTagId: null,
    defaultColors: null,
    ...overrides,
  }
}

describe('resolveEventTag', () => {
  it('id가 실제 태그 UUID면 kind=explicit 이고 그 태그 정보가 반환된다', () => {
    const tag: EventTag = { uuid: 't1', name: 'Work', color_hex: '#ff0000' }
    const r = resolveEventTag('t1', ctx({ tags: new Map([['t1', tag]]) }))
    expect(r.kind).toBe('explicit')
    if (r.kind === 'explicit') {
      expect(r.tag).toBe(tag)
      expect(r.color).toBe('#ff0000')
    }
  })

  it('id가 HOLIDAY_TAG_ID이고 서버 holiday 색상이 있으면 그 색상을 사용한다', () => {
    const r = resolveEventTag(HOLIDAY_TAG_ID, ctx({ defaultColors: { default: '#111111', holiday: '#222222' } }))
    expect(r.kind).toBe('holiday')
    expect(r.color).toBe('#222222')
  })

  it('id가 HOLIDAY_TAG_ID이고 서버 색상이 없으면 앱 내장 공휴일 색상으로 폴백한다', () => {
    const r = resolveEventTag(HOLIDAY_TAG_ID, ctx())
    expect(r.kind).toBe('holiday')
    expect(r.color).toBe(APP_FALLBACK_HOLIDAY_COLOR)
  })

  it('id가 DEFAULT_TAG_ID이고 서버 default 색상이 있으면 그 색상을 사용한다', () => {
    const r = resolveEventTag(DEFAULT_TAG_ID, ctx({ defaultColors: { default: '#111111', holiday: '#222222' } }))
    expect(r.kind).toBe('default')
    expect(r.color).toBe('#111111')
  })

  it('id가 DEFAULT_TAG_ID이고 서버 색상이 없으면 앱 내장 기본 색상으로 폴백한다', () => {
    const r = resolveEventTag(DEFAULT_TAG_ID, ctx())
    expect(r.kind).toBe('default')
    expect(r.color).toBe(APP_FALLBACK_DEFAULT_COLOR)
  })

  it('id가 null이고 defaultTagId가 실제 태그를 가리키면 그 태그로 해석된다', () => {
    const tag: EventTag = { uuid: 't-personal', name: 'Personal', color_hex: '#00ff00' }
    const r = resolveEventTag(null, ctx({ tags: new Map([['t-personal', tag]]), defaultTagId: 't-personal' }))
    expect(r.kind).toBe('explicit')
    if (r.kind === 'explicit') expect(r.tag).toBe(tag)
  })

  it('id가 null이고 defaultTagId가 없으면 kind=default + 서버 디폴트 색상이 반환된다', () => {
    const r = resolveEventTag(null, ctx({ defaultColors: { default: '#123456', holiday: '#abcdef' } }))
    expect(r.kind).toBe('default')
    expect(r.color).toBe('#123456')
  })

  it('id가 null이고 defaultTagId/defaultColors 모두 없으면 kind=default + 앱 내장 기본 색상으로 폴백한다', () => {
    const r = resolveEventTag(null, ctx())
    expect(r.kind).toBe('default')
    expect(r.color).toBe(APP_FALLBACK_DEFAULT_COLOR)
  })

  it('id가 UUID지만 태그 맵에 없으면(삭제됨) defaultTagId 경로로 폴백한다', () => {
    const tag: EventTag = { uuid: 't-fb', name: 'Fallback', color_hex: '#cccccc' }
    const r = resolveEventTag('t-ghost', ctx({ tags: new Map([['t-fb', tag]]), defaultTagId: 't-fb' }))
    expect(r.kind).toBe('explicit')
    if (r.kind === 'explicit') expect(r.tag).toBe(tag)
  })

  it('defaultTagId가 매직 스트링과 같아도 무한 재귀 없이 kind=default로 종결된다', () => {
    const r = resolveEventTag(null, ctx({ defaultTagId: DEFAULT_TAG_ID, defaultColors: { default: '#777', holiday: '#888' } }))
    expect(r.kind).toBe('default')
    expect(r.color).toBe('#777')
  })

  it('태그 색상이 비어있으면(tag.color_hex == null) 앱 내장 기본 색상으로 채워진다', () => {
    const tag: EventTag = { uuid: 't1', name: 'NoColor', color_hex: null as unknown as string }
    const r = resolveEventTag('t1', ctx({ tags: new Map([['t1', tag]]) }))
    expect(r.color).toBe(APP_FALLBACK_DEFAULT_COLOR)
  })
})
