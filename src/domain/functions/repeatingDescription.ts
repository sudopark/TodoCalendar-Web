import type { TFunction } from 'i18next'
import type { Repeating, WeekOrdinal } from '../../models'
import { formatFullDate, monthLongLabels, weekdayShortLabels } from '../../utils/locale'

const ORDINAL_KEYS = [
  'repeating.ordinal.first',
  'repeating.ordinal.second',
  'repeating.ordinal.third',
  'repeating.ordinal.fourth',
  'repeating.ordinal.fifth',
]

function ordinalLabel(ordinal: WeekOrdinal, t: TFunction): string {
  if (ordinal.isLast) return t('repeating.ordinal.last')
  if (ordinal.seq == null) return t('repeating.ordinal.first')
  const key = ORDINAL_KEYS[ordinal.seq - 1]
  return key ? t(key) : t('repeating.ordinal.nth', { n: ordinal.seq })
}

function daysLabel(dayOfWeek: readonly number[], t: TFunction, locale: string): string {
  // weekStartDay 0 으로 받아 배열 인덱스가 곧 요일 번호(0=일)가 되게 한다
  const labels = weekdayShortLabels(locale, 0)
  return [...dayOfWeek]
    .sort((a, b) => a - b)
    .map(d => labels[d])
    .join(t('repeating.day_separator'))
}

function monthLabel(month: number | undefined, locale: string): string {
  return monthLongLabels(locale)[(month ?? 1) - 1] ?? String(month)
}

function describeOption(repeating: Repeating, t: TFunction, locale: string): string {
  const { option } = repeating

  switch (option.optionType) {
    case 'every_day':
      return option.interval === 1
        ? t('repeating.desc.every_day')
        : t('repeating.desc.every_n_days', { interval: option.interval })

    case 'every_week': {
      const days = daysLabel(option.dayOfWeek, t, locale)
      return option.interval === 1
        ? t('repeating.desc.every_week', { days })
        : t('repeating.desc.every_n_weeks', { interval: option.interval, days })
    }

    case 'every_month': {
      const sel = option.monthDaySelection
      if ('days' in sel) {
        const day = sel.days[0]
        return option.interval === 1
          ? t('repeating.desc.every_month_day', { day })
          : t('repeating.desc.every_n_months_day', { interval: option.interval, day })
      }
      // 앱 UX 상 ordinal/요일은 단일 선택만 지원하므로 첫 번째 요소만 사용
      const ordinal = ordinalLabel(sel.weekOrdinals[0], t)
      const days = daysLabel(sel.weekDays, t, locale)
      return option.interval === 1
        ? t('repeating.desc.every_month_ordinal', { ordinal, days })
        : t('repeating.desc.every_n_months_ordinal', { interval: option.interval, ordinal, days })
    }

    case 'every_year': {
      // 앱 UX 상 ordinal/요일은 단일 선택만 지원하므로 첫 번째 요소만 사용
      const month = monthLabel(option.months[0], locale)
      const ordinal = ordinalLabel(option.weekOrdinals[0], t)
      const days = daysLabel(option.dayOfWeek, t, locale)
      return option.interval === 1
        ? t('repeating.desc.every_year_ordinal', { month, ordinal, days })
        : t('repeating.desc.every_n_years_ordinal', { interval: option.interval, month, ordinal, days })
    }

    case 'every_year_some_day': {
      const month = monthLabel(option.month, locale)
      return option.interval === 1
        ? t('repeating.desc.every_year_date', { month, day: option.day })
        : t('repeating.desc.every_n_years_date', { interval: option.interval, month, day: option.day })
    }

    case 'lunar_calendar_every_year':
      return t('repeating.desc.lunar_every_year', {
        month: monthLabel(option.month, locale),
        day: option.day,
      })
  }
}

function withEndCondition(description: string, repeating: Repeating, t: TFunction, locale: string): string {
  if (repeating.end != null) {
    return t('repeating.desc.until_date', {
      description,
      date: formatFullDate(new Date(repeating.end * 1000), locale),
    })
  }
  if (repeating.end_count != null) {
    return t('repeating.desc.n_times', { description, n: repeating.end_count })
  }
  return description
}

export function describeRepeating(repeating: Repeating, t: TFunction, locale: string): string {
  return withEndCondition(describeOption(repeating, t, locale), repeating, t, locale)
}
