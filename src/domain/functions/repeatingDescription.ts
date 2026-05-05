import type { TFunction } from 'i18next'
import type { Repeating } from '../../models'

const KO_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const KO_MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const KO_ORD_LABELS = ['첫째', '둘째', '셋째', '넷째', '다섯째']

function formatEndSuffix(repeating: Repeating): string {
  if (repeating.end != null) {
    const d = new Date(repeating.end * 1000)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `, ${y}년 ${m}월 ${day}일까지`
  }
  if (repeating.end_count != null) {
    return `, ${repeating.end_count}회`
  }
  return ''
}

export function describeRepeating(repeating: Repeating, _t?: TFunction): string {
  const { option } = repeating
  const suffix = formatEndSuffix(repeating)

  switch (option.optionType) {
    case 'every_day': {
      const base = option.interval === 1 ? '매일 반복' : `${option.interval}일마다 반복`
      return base + suffix
    }

    case 'every_week': {
      const sorted = [...option.dayOfWeek].sort((a, b) => a - b)
      const daysLabel = sorted.map(d => KO_DAY_LABELS[d]).join('·')
      const base =
        option.interval === 1
          ? `매주 ${daysLabel} 반복`
          : `${option.interval}주마다 ${daysLabel} 반복`
      return base + suffix
    }

    case 'every_month': {
      const sel = option.monthDaySelection
      let baseDesc: string
      if ('days' in sel) {
        const day = sel.days[0]
        const base = option.interval === 1 ? `매월 ${day}일 반복` : `${option.interval}개월마다 ${day}일 반복`
        baseDesc = base
      } else {
        // week ordinal mode
        const ordinal = sel.weekOrdinals[0]
        const ordLabel = ordinal.isLast ? '마지막' : (ordinal.seq != null ? KO_ORD_LABELS[ordinal.seq - 1] ?? `${ordinal.seq}번째` : '첫째')
        const weekDaysLabel = sel.weekDays.map(d => KO_DAY_LABELS[d]).join('·')
        const base = option.interval === 1
          ? `매월 ${ordLabel} ${weekDaysLabel} 반복`
          : `${option.interval}개월마다 ${ordLabel} ${weekDaysLabel} 반복`
        baseDesc = base
      }
      return baseDesc + suffix
    }

    case 'every_year': {
      const month = option.months[0]
      const ordinal = option.weekOrdinals[0]
      const ordLabel = ordinal.isLast ? '마지막' : (ordinal.seq != null ? KO_ORD_LABELS[ordinal.seq - 1] ?? `${ordinal.seq}번째` : '첫째')
      const weekDaysLabel = option.dayOfWeek.map(d => KO_DAY_LABELS[d]).join('·')
      const monthName = KO_MONTH_LABELS[(month ?? 1) - 1] ?? `${month}월`
      const base = option.interval === 1
        ? `매년 ${monthName} ${ordLabel} ${weekDaysLabel} 반복`
        : `${option.interval}년마다 ${monthName} ${ordLabel} ${weekDaysLabel} 반복`
      return base + suffix
    }

    case 'every_year_some_day': {
      const monthName = KO_MONTH_LABELS[(option.month ?? 1) - 1] ?? `${option.month}월`
      const base = option.interval === 1
        ? `매년 ${monthName} ${option.day}일 반복`
        : `${option.interval}년마다 ${monthName} ${option.day}일 반복`
      return base + suffix
    }

    case 'lunar_calendar_every_year': {
      const monthName = KO_MONTH_LABELS[(option.month ?? 1) - 1] ?? `${option.month}월`
      return `음력 매년 ${monthName} ${option.day}일 반복` + suffix
    }
  }
}
