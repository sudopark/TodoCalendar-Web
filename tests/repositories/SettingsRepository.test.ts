import { describe, it, expect, beforeEach, vi } from 'vitest'

// 의존성 차단
vi.mock('../../src/firebase', () => ({ getAuthInstance: vi.fn(() => ({})), app: {} }))
vi.mock('../../src/api/apiClient', () => ({ apiClient: { put: vi.fn() } }))

import { SettingsRepository } from '../../src/repositories/SettingsRepository'
import { useSettingsCache } from '../../src/repositories/caches/settingsCache'

// ──────────────────────── helpers ────────────────────────

function resetCache() {
  useSettingsCache.setState({
    calendarAppearance: {
      weekStartDay: 0,
      accentDays: { holiday: true, saturday: false, sunday: true },
      eventDisplayLevel: 'medium',
      rowHeight: 70,
      eventFontSizeWeight: 0,
      showEventNames: true,
      eventListFontSizeWeight: 0,
      showHolidayInEventList: true,
      showLunarCalendar: false,
      showUncompletedTodos: true,
    },
    eventDefaults: {
      defaultTagId: null,
      defaultNotificationSeconds: null,
      defaultAllDayNotificationSeconds: null,
    },
    timezone: {
      timezone: 'UTC',
      systemTimezone: 'UTC',
      isCustom: false,
    },
    notification: {
      permission: 'default',
      fcmToken: null,
    },
  })
  try { localStorage.clear() } catch { /* jsdom */ }
}

// ──────────────────────── updateCalendarAppearance ───────

describe('SettingsRepository — updateCalendarAppearance', () => {
  beforeEach(resetCache)

  it('주 시작 요일을 변경하면 캐시에 반영된다', () => {
    // given
    const repo = new SettingsRepository()

    // when
    repo.updateCalendarAppearance({ weekStartDay: 1 })

    // then
    expect(repo.getCalendarAppearanceSnapshot().weekStartDay).toBe(1)
  })

  it('이벤트 표시 레벨을 변경하면 캐시에 반영된다', () => {
    // given
    const repo = new SettingsRepository()

    // when
    repo.updateCalendarAppearance({ eventDisplayLevel: 'full' })

    // then
    expect(repo.getCalendarAppearanceSnapshot().eventDisplayLevel).toBe('full')
  })

  it('일부 필드만 변경해도 나머지 필드는 유지된다', () => {
    // given
    const repo = new SettingsRepository()
    repo.updateCalendarAppearance({ rowHeight: 90 })

    // then
    const snap = repo.getCalendarAppearanceSnapshot()
    expect(snap.rowHeight).toBe(90)
    expect(snap.weekStartDay).toBe(0)
    expect(snap.eventDisplayLevel).toBe('medium')
  })
})

// ──────────────────────── resetCalendarAppearanceToDefaults ──

describe('SettingsRepository — resetCalendarAppearanceToDefaults', () => {
  beforeEach(resetCache)

  it('기본값으로 초기화하면 weekStartDay가 0이 된다', () => {
    // given
    const repo = new SettingsRepository()
    repo.updateCalendarAppearance({ weekStartDay: 5, rowHeight: 100 })

    // when
    repo.resetCalendarAppearanceToDefaults()

    // then
    const snap = repo.getCalendarAppearanceSnapshot()
    expect(snap.weekStartDay).toBe(0)
    expect(snap.rowHeight).toBe(70)
  })
})

// ──────────────────────── updateEventDefaults ────────────

describe('SettingsRepository — updateEventDefaults', () => {
  beforeEach(resetCache)

  it('기본 태그를 변경하면 캐시에 반영된다', () => {
    // given
    const repo = new SettingsRepository()

    // when
    repo.updateEventDefaults({ defaultTagId: 'tag-abc' })

    // then
    expect(repo.getEventDefaultsSnapshot().defaultTagId).toBe('tag-abc')
  })

  it('기본 알림 시간을 변경하면 캐시에 반영된다', () => {
    // given
    const repo = new SettingsRepository()

    // when
    repo.updateEventDefaults({ defaultNotificationSeconds: -300 })

    // then
    expect(repo.getEventDefaultsSnapshot().defaultNotificationSeconds).toBe(-300)
  })

  it('null로 변경하면 기본값이 제거된다', () => {
    // given
    const repo = new SettingsRepository()
    repo.updateEventDefaults({ defaultTagId: 'tag-x' })

    // when
    repo.updateEventDefaults({ defaultTagId: null })

    // then
    expect(repo.getEventDefaultsSnapshot().defaultTagId).toBeNull()
  })
})

// ──────────────────────── updateTimezone ─────────────────

describe('SettingsRepository — updateTimezone', () => {
  beforeEach(resetCache)

  it('타임존을 변경하면 캐시에 반영되고 isCustom이 true가 된다', () => {
    // given
    const repo = new SettingsRepository()

    // when
    repo.updateTimezone('Asia/Seoul')

    // then
    const snap = repo.getTimezoneSnapshot()
    expect(snap.timezone).toBe('Asia/Seoul')
    expect(snap.isCustom).toBe(true)
  })

  it('null을 전달하면 시스템 타임존으로 복원되고 isCustom이 false가 된다', () => {
    // given
    const repo = new SettingsRepository()
    repo.updateTimezone('Asia/Seoul')

    // when
    repo.updateTimezone(null)

    // then
    const snap = repo.getTimezoneSnapshot()
    expect(snap.isCustom).toBe(false)
  })
})

// ──────────────────────── getNotificationSnapshot ────────

describe('SettingsRepository — getNotificationSnapshot', () => {
  beforeEach(resetCache)

  it('초기 permission은 default이다', () => {
    // given
    const repo = new SettingsRepository()

    // then
    expect(repo.getNotificationSnapshot().permission).toBe('default')
  })

  it('캐시에 직접 permission을 설정하면 snapshot에 반영된다', () => {
    // given
    const repo = new SettingsRepository()
    useSettingsCache.setState(s => ({ notification: { ...s.notification, permission: 'granted' } }))

    // then
    expect(repo.getNotificationSnapshot().permission).toBe('granted')
  })
})

// ──────────────────────── reset ──────────────────────────

describe('SettingsRepository — reset', () => {
  beforeEach(resetCache)

  it('reset 후 notification.permission이 초기 브라우저 상태로 돌아간다', () => {
    // given
    const repo = new SettingsRepository()
    useSettingsCache.setState(s => ({ notification: { ...s.notification, fcmToken: 'some-token' } }))

    // when
    repo.reset()

    // then
    expect(repo.getNotificationSnapshot().fcmToken).toBeNull()
  })
})
