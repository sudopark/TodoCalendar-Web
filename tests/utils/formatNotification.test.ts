import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import { formatNotification } from '../../src/utils/formatNotification'
import type { NotificationOption } from '../../src/models'

const t: TFunction = ((key: string, _opts?: unknown) => key) as unknown as TFunction

describe('formatNotification', () => {
  it('time 타입의 0초 옵션은 "정시" 라벨 키를 반환한다', () => {
    const opt: NotificationOption = { type: 'time', seconds: 0 }
    expect(formatNotification(opt, t)).toBe('notif.on_time')
  })

  it('time 타입의 -300초 옵션은 "5분 전" 라벨 키를 반환한다', () => {
    const opt: NotificationOption = { type: 'time', seconds: -300 }
    expect(formatNotification(opt, t)).toBe('notif.5min_before')
  })

  it('preset에 없는 time 초수 옵션은 "{n}초 전" 형태로 폴백된다', () => {
    const opt: NotificationOption = { type: 'time', seconds: -123 }
    expect(formatNotification(opt, t)).toBe('123초 전')
  })

  it('allday 타입의 같은 날 9시 옵션은 해당 preset 키를 반환한다', () => {
    const opt: NotificationOption = { type: 'allday', dayOffset: 0, hour: 9, minute: 0 }
    expect(formatNotification(opt, t)).toBe('notif.allday_same_day_9am')
  })

  it('allday 타입의 1주 전 9시 옵션은 해당 preset 키를 반환한다', () => {
    const opt: NotificationOption = { type: 'allday', dayOffset: -7, hour: 9, minute: 0 }
    expect(formatNotification(opt, t)).toBe('notif.allday_1week_before_9am')
  })

  it('preset에 없는 allday 옵션은 "{n}일 전 H:MM" 폴백으로 변환된다', () => {
    const opt: NotificationOption = { type: 'allday', dayOffset: -3, hour: 8, minute: 30 }
    expect(formatNotification(opt, t)).toBe('3일 전 8:30')
  })
})
