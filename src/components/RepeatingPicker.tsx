import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { Repeating, RepeatingOption } from '../models'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // 월~일 display order

type RepeatType =
  | 'none'
  | 'every_day'
  | 'every_week'
  | 'every_month'
  | 'every_year'
  | 'every_year_some_day'
  | 'lunar_calendar_every_year'

function defaultOption(type: Exclude<RepeatType, 'none'>, startTs: number): RepeatingOption {
  const d = new Date(startTs * 1000)
  switch (type) {
    case 'every_day':
      return { optionType: 'every_day', interval: 1 }
    case 'every_week':
      return { optionType: 'every_week', interval: 1, dayOfWeek: [d.getDay()], timeZone: TZ }
    case 'every_month':
      return { optionType: 'every_month', interval: 1, monthDaySelection: { days: [d.getDate()] }, timeZone: TZ }
    case 'every_year':
      return { optionType: 'every_year', interval: 1, months: [d.getMonth() + 1], weekOrdinals: [{ seq: 1, isLast: false }], dayOfWeek: [d.getDay()], timeZone: TZ }
    case 'every_year_some_day':
      return { optionType: 'every_year_some_day', interval: 1, month: d.getMonth() + 1, day: d.getDate(), timeZone: TZ }
    case 'lunar_calendar_every_year':
      return { optionType: 'lunar_calendar_every_year', month: d.getMonth() + 1, day: d.getDate(), timeZone: TZ }
  }
}

interface RepeatingPickerProps {
  value: Repeating | null
  onChange: (value: Repeating | null) => void
  startTimestamp: number
}

const TYPE_LABEL_KEY: Record<Exclude<RepeatType, 'none'>, string> = {
  every_day: 'repeating.daily',
  every_week: 'repeating.weekly',
  every_month: 'repeating.monthly',
  every_year: 'repeating.yearly',
  every_year_some_day: 'repeating.yearly_some_day',
  lunar_calendar_every_year: 'repeating.lunar',
}

export function RepeatingPicker({ value, onChange, startTimestamp }: RepeatingPickerProps) {
  const { t, i18n } = useTranslation()
  const isKo = i18n.language !== 'en'
  const DAY_LABELS = isKo
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const DAY_FULL_LABELS = isKo
    ? ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const [selectedType, setSelectedType] = useState<RepeatType>(
    value ? value.option.optionType : 'none'
  )
  const [option, setOption] = useState<RepeatingOption>(
    value?.option ?? defaultOption('every_day', startTimestamp)
  )
  const [endType, setEndType] = useState<'none' | 'date' | 'count'>(() => {
    if (value?.end_count != null) return 'count'
    if (value?.end != null) return 'date'
    return 'none'
  })
  const [endDate, setEndDate] = useState(() => {
    if (value?.end != null) {
      const d = new Date(value.end * 1000)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
    }
    return ''
  })
  const [endCount, setEndCount] = useState(() => value?.end_count ?? 10)
  const [monthMode, setMonthMode] = useState<'days' | 'week'>(() => {
    if (value?.option.optionType === 'every_month') {
      return 'weekOrdinals' in value.option.monthDaySelection ? 'week' : 'days'
    }
    return 'days'
  })

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function emitWithEnd(opt: RepeatingOption, et: 'none' | 'date' | 'count', ed: string, ec: number) {
    const end = et === 'date' && ed ? Math.floor(new Date(ed + 'T00:00:00').getTime() / 1000) : undefined
    const end_count = et === 'count' ? ec : undefined
    onChange({ start: startTimestamp, option: opt, end, end_count })
  }

  function emit(opt: RepeatingOption) {
    emitWithEnd(opt, endType, endDate, endCount)
  }

  function handleTypeChange(type: RepeatType) {
    setSelectedType(type)
    if (type === 'none') {
      onChange(null)
      return
    }
    const opt = defaultOption(type, startTimestamp)
    setOption(opt)
    emit(opt)
  }

  // Type-narrowed helpers
  const weekOption = option.optionType === 'every_week' ? option : null
  const monthOption = option.optionType === 'every_month' ? option : null
  const yearOption = option.optionType === 'every_year' ? option : null
  const yearSomeDayOption = option.optionType === 'every_year_some_day' ? option : null
  const lunarOption = option.optionType === 'lunar_calendar_every_year' ? option : null
  const specificDayOption = yearSomeDayOption ?? lunarOption
  const interval = option.optionType !== 'lunar_calendar_every_year' ? option.interval : null

  const summaryText =
    selectedType === 'none' ? t('repeating.not_repeat') : t(TYPE_LABEL_KEY[selectedType])

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        aria-label={t('repeating.enabled')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {summaryText}
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 z-10 mt-1 w-80 space-y-3 rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:bg-gray-800 dark:border-gray-700"
        >
          {/* 반복 유형 */}
          <div>
            <label className="block text-xs text-gray-500" htmlFor="repeating-type-select">
              {t('repeating.type')}
            </label>
            <select
              id="repeating-type-select"
              aria-label={t('repeating.type')}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={selectedType}
              onChange={e => handleTypeChange(e.target.value as RepeatType)}
            >
              <option value="none">{t('repeating.not_repeat')}</option>
              <option value="every_day">{t('repeating.daily')}</option>
              <option value="every_week">{t('repeating.weekly')}</option>
              <option value="every_month">{t('repeating.monthly')}</option>
              <option value="every_year">{t('repeating.yearly')}</option>
              <option value="every_year_some_day">{t('repeating.yearly_some_day')}</option>
              <option value="lunar_calendar_every_year">{t('repeating.lunar')}</option>
            </select>
          </div>

          {selectedType !== 'none' && (
            <>
              {/* 간격 (음력 제외) */}
              {interval !== null && (
                <div>
                  <label className="block text-xs text-gray-500">{t('repeating.interval')}</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    value={interval}
                    onChange={e => {
                      const opt = { ...option, interval: Math.max(1, Number(e.target.value) || 1) } as RepeatingOption
                      setOption(opt)
                      emit(opt)
                    }}
                  />
                </div>
              )}

              {/* 매주: 요일 체크박스 */}
              {weekOption && (
                <div>
                  <p className="text-xs text-gray-500">{t('repeating.day_of_week')}</p>
                  <div className="mt-1 flex gap-1">
                    {DAY_ORDER.map(i => (
                      <div key={i} className="flex flex-col items-center text-xs">
                        <input
                          type="checkbox"
                          aria-label={DAY_FULL_LABELS[i]}
                          checked={weekOption.dayOfWeek.includes(i)}
                          onChange={() => {
                            const filtered = weekOption.dayOfWeek.filter(x => x !== i)
                            const days = weekOption.dayOfWeek.includes(i)
                              ? (filtered.length > 0 ? filtered : weekOption.dayOfWeek)
                              : [...weekOption.dayOfWeek, i]
                            const opt: RepeatingOption = { ...weekOption, dayOfWeek: days }
                            setOption(opt)
                            emit(opt)
                          }}
                        />
                        <span aria-hidden="true">{DAY_LABELS[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 매월: 날짜/요일 모드 */}
              {monthOption && (
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="month-mode"
                        checked={monthMode === 'days'}
                        onChange={() => setMonthMode('days')}
                      />
                      {t('repeating.month_mode_days')}
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="month-mode"
                        checked={monthMode === 'week'}
                        onChange={() => setMonthMode('week')}
                      />
                      {t('repeating.month_mode_week')}
                    </label>
                  </div>
                  {monthMode === 'days' && (
                    <div>
                      <label className="block text-xs text-gray-500">{t('repeating.date_label')}</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                        value={'days' in monthOption.monthDaySelection ? monthOption.monthDaySelection.days[0] : 1}
                        onChange={e => {
                          const opt: RepeatingOption = {
                            ...monthOption,
                            monthDaySelection: { days: [Number(e.target.value)] },
                          }
                          setOption(opt)
                          emit(opt)
                        }}
                      />
                    </div>
                  )}
                  {monthMode === 'week' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500" htmlFor="month-week-seq">{t('repeating.week_seq')}</label>
                        <input
                          id="month-week-seq"
                          type="number"
                          min={1}
                          max={5}
                          aria-label={t('repeating.week_seq')}
                          className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                          value={
                            'weekOrdinals' in monthOption.monthDaySelection &&
                            monthOption.monthDaySelection.weekOrdinals.length > 0
                              ? (monthOption.monthDaySelection.weekOrdinals[0].seq ?? 1)
                              : 1
                          }
                          onChange={e => {
                            const seq = Number(e.target.value)
                            const prevDays =
                              'weekDays' in monthOption.monthDaySelection
                                ? monthOption.monthDaySelection.weekDays
                                : []
                            const opt: RepeatingOption = {
                              ...monthOption,
                              monthDaySelection: {
                                weekOrdinals: [{ isLast: false, seq }],
                                weekDays: prevDays,
                              },
                            }
                            setOption(opt)
                            emit(opt)
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('repeating.day_of_week')}</p>
                        <div className="mt-1 flex gap-1">
                          {DAY_ORDER.map(i => {
                            const currentDays =
                              'weekDays' in monthOption.monthDaySelection
                                ? monthOption.monthDaySelection.weekDays
                                : []
                            return (
                              <div key={i} className="flex flex-col items-center text-xs">
                                <input
                                  type="checkbox"
                                  aria-label={DAY_FULL_LABELS[i]}
                                  checked={currentDays.includes(i)}
                                  onChange={() => {
                                    const days = currentDays.includes(i)
                                      ? currentDays.filter(x => x !== i)
                                      : [...currentDays, i]
                                    const currentOrdinals =
                                      'weekOrdinals' in monthOption.monthDaySelection
                                        ? monthOption.monthDaySelection.weekOrdinals
                                        : [{ isLast: false, seq: 1 }]
                                    const opt: RepeatingOption = {
                                      ...monthOption,
                                      monthDaySelection: {
                                        weekOrdinals: currentOrdinals,
                                        weekDays: days,
                                      },
                                    }
                                    setOption(opt)
                                    emit(opt)
                                  }}
                                />
                                <span aria-hidden="true">{DAY_LABELS[i]}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 매년: 월 + 주차 + 요일 */}
              {yearOption && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500" htmlFor="year-month">{t('repeating.month_label')}</label>
                    <input
                      id="year-month"
                      type="number"
                      min={1}
                      max={12}
                      aria-label={t('repeating.month_label')}
                      className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      value={yearOption.months[0] ?? 1}
                      onChange={e => {
                        const opt: RepeatingOption = { ...yearOption, months: [Number(e.target.value)] }
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500" htmlFor="year-week-seq">{t('repeating.week_seq')}</label>
                    <input
                      id="year-week-seq"
                      type="number"
                      min={1}
                      max={5}
                      aria-label={t('repeating.week_seq')}
                      className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      value={yearOption.weekOrdinals.length > 0 ? (yearOption.weekOrdinals[0].seq ?? 1) : 1}
                      onChange={e => {
                        const seq = Number(e.target.value)
                        const opt: RepeatingOption = {
                          ...yearOption,
                          weekOrdinals: [{ isLast: false, seq }],
                        }
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('repeating.day_of_week')}</p>
                    <div className="mt-1 flex gap-1">
                      {DAY_ORDER.map(i => (
                        <div key={i} className="flex flex-col items-center text-xs">
                          <input
                            type="checkbox"
                            aria-label={DAY_FULL_LABELS[i]}
                            checked={yearOption.dayOfWeek.includes(i)}
                            onChange={() => {
                              const days = yearOption.dayOfWeek.includes(i)
                                ? yearOption.dayOfWeek.filter(x => x !== i)
                                : [...yearOption.dayOfWeek, i]
                              if (days.length === 0) return
                              const opt: RepeatingOption = { ...yearOption, dayOfWeek: days }
                              setOption(opt)
                              emit(opt)
                            }}
                          />
                          <span aria-hidden="true">{DAY_LABELS[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 매년 특정일 / 음력 */}
              {specificDayOption && (
                <div className="flex gap-3">
                  <div>
                    <label className="block text-xs text-gray-500">{t('repeating.month_label')}</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      value={specificDayOption.month}
                      onChange={e => {
                        const opt = { ...specificDayOption, month: Number(e.target.value) } as RepeatingOption
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">{t('repeating.day_label')}</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="mt-1 w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      value={specificDayOption.day}
                      onChange={e => {
                        const opt = { ...specificDayOption, day: Number(e.target.value) } as RepeatingOption
                        setOption(opt)
                        emit(opt)
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 종료 조건 */}
              <div>
                <label className="block text-xs text-gray-500">{t('repeating.end_condition')}</label>
                <div className="mt-1 flex gap-3">
                  {(['none', 'date', 'count'] as const).map(et => (
                    <label key={et} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="end-type"
                        checked={endType === et}
                        onChange={() => {
                          setEndType(et)
                          emitWithEnd(option, et, endDate, endCount)
                        }}
                      />
                      {et === 'none' ? t('repeating.end_none') : et === 'date' ? t('repeating.end_date') : t('repeating.end_count')}
                    </label>
                  ))}
                </div>
                {endType === 'date' && (
                  <input
                    type="date"
                    className="mt-2 rounded border border-gray-300 px-2 py-1 text-sm"
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value)
                      emitWithEnd(option, endType, e.target.value, endCount)
                    }}
                  />
                )}
                {endType === 'count' && (
                  <input
                    type="number"
                    min={1}
                    className="mt-2 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                    value={endCount}
                    onChange={e => {
                      setEndCount(Number(e.target.value))
                      emitWithEnd(option, endType, endDate, Number(e.target.value))
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
