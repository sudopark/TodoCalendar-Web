import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RepeatingSection } from '../../../src/components/eventForm/RepeatingSection'
import type { EventTime, Repeating } from '../../../src/models'

const eventTime: EventTime = { time_type: 'at', timestamp: 1743375600 }

describe('RepeatingSection', () => {
  it('repeating이 null이면 description 라인이 표시되지 않는다', () => {
    // given
    render(
      <RepeatingSection
        eventTime={eventTime}
        repeating={null}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(screen.queryByText(/반복$/)).not.toBeInTheDocument()
    // "반복 안 함" 트리거는 있지만 보조 description 텍스트는 없음
    expect(screen.queryByText(/매일 반복|마다 반복|음력/)).not.toBeInTheDocument()
  })

  it('every_day interval 1 반복 옵션이 설정되면 "매일 반복" 텍스트가 표시된다', () => {
    // given
    const repeating: Repeating = {
      start: 1743375600,
      option: { optionType: 'every_day', interval: 1 },
    }

    // when
    render(
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(screen.getByText('매일 반복')).toBeInTheDocument()
  })

  it('every_day interval 3 반복 옵션이면 "3일마다 반복" 텍스트가 표시된다', () => {
    // given
    const repeating: Repeating = {
      start: 1743375600,
      option: { optionType: 'every_day', interval: 3 },
    }

    // when
    render(
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(screen.getByText('3일마다 반복')).toBeInTheDocument()
  })

  it('every_week 옵션이면 요일 목록이 포함된 설명이 표시된다', () => {
    // given
    const repeating: Repeating = {
      start: 1743375600,
      option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 3, 5], timeZone: 'UTC' },
    }

    // when
    render(
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(screen.getByText('매주 월·수·금 반복')).toBeInTheDocument()
  })

  it('end_count 종료 조건이 있으면 description에 횟수 정보가 포함된다', () => {
    // given
    const repeating: Repeating = {
      start: 1743375600,
      option: { optionType: 'every_day', interval: 1 },
      end_count: 10,
    }

    // when
    render(
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(screen.getByText('매일 반복, 10회')).toBeInTheDocument()
  })

  it('lunar_calendar_every_year 옵션이면 "음력 매년..." 텍스트가 표시된다', () => {
    // given
    const repeating: Repeating = {
      start: 1743375600,
      option: { optionType: 'lunar_calendar_every_year', month: 1, day: 1, timeZone: 'UTC' },
    }

    // when
    render(
      <RepeatingSection
        eventTime={eventTime}
        repeating={repeating}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(screen.getByText('음력 매년 1월 1일 반복')).toBeInTheDocument()
  })

  it('eventTime이 null이면 아무것도 렌더링하지 않는다', () => {
    // given / when
    const { container } = render(
      <RepeatingSection
        eventTime={null}
        repeating={null}
        onRepeatingChange={vi.fn()}
      />
    )

    // then
    expect(container.innerHTML).toBe('')
  })
})
