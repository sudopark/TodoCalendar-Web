import type { Repeating, RepeatingOption } from '../models'

// 서버 weekday 인코딩은 1=일..7=토 (iOS EventRepeatingOption+CodableMapper).
// web 은 Date.getDay() 기준 0=일..6=토 로 통일돼 있다. API 경계에서만 변환한다.

function shiftDays(days: number[], delta: number): number[] {
  return days.map(d => d + delta)
}

function shiftOption(option: RepeatingOption, delta: number): RepeatingOption {
  switch (option.optionType) {
    case 'every_week':
      return { ...option, dayOfWeek: shiftDays(option.dayOfWeek, delta) }
    case 'every_year':
      return { ...option, dayOfWeek: shiftDays(option.dayOfWeek, delta) }
    case 'every_month': {
      const sel = option.monthDaySelection
      if ('weekDays' in sel) {
        return { ...option, monthDaySelection: { ...sel, weekDays: shiftDays(sel.weekDays, delta) } }
      }
      return option
    }
    default:
      return option
  }
}

export function repeatingFromServer(r: Repeating): Repeating {
  return { ...r, option: shiftOption(r.option, -1) }
}

export function repeatingToServer(r: Repeating): Repeating {
  return { ...r, option: shiftOption(r.option, +1) }
}
