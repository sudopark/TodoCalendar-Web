import { describe, test, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '../../src/i18n'
import { EventTimeDisplay } from '../../src/components/EventTimeDisplay'
import type { EventTime } from '../../src/models'
import { formatTimeOfDay, formatTimeRange, formatMonthDay } from '../../src/utils/locale'

const AT_TS = Math.floor(new Date('2026-04-27T05:30:00Z').getTime() / 1000)

describe('EventTimeDisplay', () => {
  afterEach(async () => {
    await i18n.changeLanguage('ko')
  })

  test('at 타입이면 활성 로케일의 시각 표기를 보여준다', () => {
    // given
    const eventTime: EventTime = { time_type: 'at', timestamp: AT_TS }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    const expected = formatTimeOfDay(new Date(AT_TS * 1000), i18n.language)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  test('언어를 바꾸면 시각 표기도 바뀐다', async () => {
    // given
    const eventTime: EventTime = { time_type: 'at', timestamp: AT_TS }
    await i18n.changeLanguage('de')
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then — de 는 24시간제
    expect(screen.getByText('14:30')).toBeInTheDocument()
  })

  test('period 타입이면 시작–종료 구간을 보여준다', () => {
    // given
    const endTs = AT_TS + 1800
    const eventTime: EventTime = { time_type: 'period', period_start: AT_TS, period_end: endTs }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    const expected = formatTimeRange(new Date(AT_TS * 1000), new Date(endTs * 1000), i18n.language)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  test('하루짜리 종일 일정이면 종일 문구를 보여준다', () => {
    // given — 2026-04-27 KST 자정 ~ 같은 날
    const dayStart = Math.floor(new Date('2026-04-26T15:00:00Z').getTime() / 1000)
    const eventTime: EventTime = {
      time_type: 'allday', period_start: dayStart, period_end: dayStart, seconds_from_gmt: 32400,
    }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    expect(screen.getByText(i18n.t('eventTime.allday'))).toBeInTheDocument()
  })

  test('여러 날 종일 일정이면 시작일–종료일을 보여준다', () => {
    // given — 2026-04-27 ~ 2026-04-29 KST
    const dayStart = Math.floor(new Date('2026-04-26T15:00:00Z').getTime() / 1000)
    const dayEnd = dayStart + 2 * 86400
    const eventTime: EventTime = {
      time_type: 'allday', period_start: dayStart, period_end: dayEnd, seconds_from_gmt: 32400,
    }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    const s = formatMonthDay(new Date((dayStart + 32400) * 1000), i18n.language, 'UTC')
    const e = formatMonthDay(new Date((dayEnd + 32400) * 1000), i18n.language, 'UTC')
    expect(screen.getByText(`${s} – ${e}`)).toBeInTheDocument()
  })

  test('UTC 기준 하루짜리 종일 일정(seconds_from_gmt=0)이면 종일 문구를 보여준다', () => {
    // given — 2026-04-27 UTC 하루 종일
    const dayStart = Math.floor(new Date('2026-04-27T00:00:00Z').getTime() / 1000)
    const eventTime: EventTime = {
      time_type: 'allday', period_start: dayStart, period_end: dayStart, seconds_from_gmt: 0,
    }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    expect(screen.getByText(i18n.t('eventTime.allday'))).toBeInTheDocument()
  })

  test('UTC 기준 여러 날 종일 일정(seconds_from_gmt=0)이면 날짜 범위를 보여준다', () => {
    // given — 2026-04-27 ~ 2026-04-29 UTC
    const dayStart = Math.floor(new Date('2026-04-27T00:00:00Z').getTime() / 1000)
    const dayEnd = dayStart + 2 * 86400
    const eventTime: EventTime = {
      time_type: 'allday', period_start: dayStart, period_end: dayEnd, seconds_from_gmt: 0,
    }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    const s = formatMonthDay(new Date(dayStart * 1000), i18n.language, 'UTC')
    const e = formatMonthDay(new Date(dayEnd * 1000), i18n.language, 'UTC')
    expect(screen.getByText(`${s} – ${e}`)).toBeInTheDocument()
  })

  test('period_end 없는 단일 일자 종일 일정이면 종일 문구를 보여준다 (#127)', () => {
    // given
    const dayStart = Math.floor(new Date('2026-04-26T15:00:00Z').getTime() / 1000)
    const eventTime: EventTime = { time_type: 'allday', period_start: dayStart, seconds_from_gmt: 32400 }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then
    expect(screen.getByText(i18n.t('eventTime.allday'))).toBeInTheDocument()
  })

  test('서쪽 오프셋(UTC-8) 여러 날 종일 일정은 UTC 기준으로 날짜를 읽는다', () => {
    // given — period_start 는 2026-04-27T00:00Z, seconds_from_gmt=-28800(서쪽 오프셋).
    // UTC 로 읽으면 4/26 시작인데, vitest 시스템 TZ(Asia/Seoul, +9h)로 읽으면 4/27 시작으로 하루씩 밀린다
    const periodStart = Math.floor(new Date('2026-04-27T00:00:00Z').getTime() / 1000)
    const periodEnd = periodStart + 2 * 86400
    const eventTime: EventTime = {
      time_type: 'allday', period_start: periodStart, period_end: periodEnd, seconds_from_gmt: -28800,
    }
    // when
    render(<EventTimeDisplay eventTime={eventTime} />)
    // then — UTC 기준 라벨이어야 한다 (시스템 TZ로 읽으면 하루씩 밀린 라벨이 나와 실패한다)
    const s = formatMonthDay(new Date((periodStart - 28800) * 1000), i18n.language, 'UTC')
    const e = formatMonthDay(new Date((periodEnd - 28800) * 1000), i18n.language, 'UTC')
    expect(screen.getByText(`${s} – ${e}`)).toBeInTheDocument()
  })
})
