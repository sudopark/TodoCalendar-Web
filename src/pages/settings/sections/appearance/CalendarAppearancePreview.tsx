import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendarAppearanceStore } from '../../../../stores/calendarAppearanceStore'

const ALL_WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/**
 * 캘린더 외관 미리보기 — 주 시작 요일 / 강조 요일 변경 즉시 반영
 * 실제 데이터 없이 4주 분량의 더미 그리드 + 토요일/일요일/공휴일 색만 시연
 */
export function CalendarAppearancePreview() {
  const { t } = useTranslation()
  const { weekStartDay, accentDays } = useCalendarAppearanceStore()

  const weekdayKeys = useMemo(
    () => [...ALL_WEEKDAY_KEYS.slice(weekStartDay), ...ALL_WEEKDAY_KEYS.slice(0, weekStartDay)],
    [weekStartDay],
  )

  // 가짜 4주 그리드 (1~28일)
  const weeks = useMemo(() => {
    const result: { num: number; dow: number; isHoliday: boolean }[][] = []
    let day = 1
    for (let w = 0; w < 4; w++) {
      const week: { num: number; dow: number; isHoliday: boolean }[] = []
      for (let i = 0; i < 7; i++) {
        const dow = (weekStartDay + i) % 7
        // 두 번째 주 화요일을 가상의 공휴일로
        const isHoliday = w === 1 && dow === 2
        week.push({ num: day++, dow, isHoliday })
      }
      result.push(week)
    }
    return result
  }, [weekStartDay])

  const accent = (dow: number, isHoliday: boolean) => (
    (accentDays.holiday && isHoliday)
    || (accentDays.sunday && dow === 0)
    || (accentDays.saturday && dow === 6)
  )

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="grid grid-cols-7 mb-1">
        {weekdayKeys.map((k, i) => {
          const dow = (weekStartDay + i) % 7
          const isAccent = (accentDays.sunday && dow === 0) || (accentDays.saturday && dow === 6)
          return (
            <div
              key={k}
              className={`text-center text-[10px] font-semibold uppercase tracking-widest ${isAccent ? 'text-[#e8a5a5]' : 'text-[#bbb]'}`}
            >
              {t(`calendar.weekdays.${k}`, k)}
            </div>
          )
        })}
      </div>
      <div className="flex flex-col">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map(cell => (
              <div
                key={`${wi}-${cell.num}`}
                className={`text-center py-1 text-xs ${accent(cell.dow, cell.isHoliday) ? 'text-red-400' : 'text-[#1f1f1f]'}`}
              >
                {cell.num}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
