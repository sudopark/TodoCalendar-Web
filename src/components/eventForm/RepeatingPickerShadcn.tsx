import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useEventFormStore } from '../../stores/eventFormStore'
import type { Repeating, RepeatingOption } from '../../models'

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon–Sun display order

function defaultOption(type: string, startTs: number): RepeatingOption {
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
    default:
      return { optionType: 'every_day', interval: 1 }
  }
}

export function RepeatingPickerShadcn() {
  const { t, i18n } = useTranslation()

  const eventTime = useEventFormStore(s => s.eventTime)
  const repeating = useEventFormStore(s => s.repeating)
  const setRepeating = useEventFormStore(s => s.setRepeating)

  const startTimestamp = eventTime
    ? (eventTime.time_type === 'at' ? eventTime.timestamp : eventTime.period_start)
    : Math.floor(Date.now() / 1000)

  const isKo = i18n.language !== 'en'
  const DAY_LABELS = isKo
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const DAY_FULL_LABELS = isKo
    ? ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const [enabled, setEnabled] = useState(!!repeating)
  const [option, setOption] = useState<RepeatingOption>(
    repeating?.option ?? defaultOption('every_day', startTimestamp)
  )
  const [endType, setEndType] = useState<'none' | 'date' | 'count'>(() => {
    if (repeating?.end_count != null) return 'count'
    if (repeating?.end != null) return 'date'
    return 'none'
  })
  const [endDate, setEndDate] = useState(() => {
    if (repeating?.end != null) {
      const d = new Date(repeating.end * 1000)
      const p = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    }
    return ''
  })
  const [endCount, setEndCount] = useState(() => repeating?.end_count ?? 10)
  const [monthMode, setMonthMode] = useState<'days' | 'week'>(() => {
    if (repeating?.option.optionType === 'every_month') {
      return 'weekOrdinals' in repeating.option.monthDaySelection ? 'week' : 'days'
    }
    return 'days'
  })

  if (!eventTime) return null

  function emitWithEnd(opt: RepeatingOption, et: 'none' | 'date' | 'count', ed: string, ec: number) {
    const end = et === 'date' && ed ? Math.floor(new Date(ed + 'T00:00:00').getTime() / 1000) : undefined
    const end_count = et === 'count' ? ec : undefined
    setRepeating({ start: startTimestamp, option: opt, end, end_count })
  }

  function emit(opt: RepeatingOption) {
    emitWithEnd(opt, endType, endDate, endCount)
  }

  function handleToggle(checked: boolean) {
    setEnabled(checked)
    if (!checked) {
      setRepeating(null)
    } else {
      emitWithEnd(option, endType, endDate, endCount)
    }
  }

  function handleTypeChange(type: string) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="repeating-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          aria-label={t('repeating.enabled')}
        />
        <Label htmlFor="repeating-toggle" className="text-sm font-medium">
          {t('repeating.enabled')}
        </Label>
      </div>

      {enabled && (
        <div className="space-y-3 pl-4">
          {/* Repeating type */}
          <div>
            <label className="block text-xs text-muted-foreground">{t('repeating.type')}</label>
            <Select
              value={option.optionType}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="mt-1" aria-label={t('repeating.type')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="every_day">{t('repeating.daily')}</SelectItem>
                <SelectItem value="every_week">{t('repeating.weekly')}</SelectItem>
                <SelectItem value="every_month">{t('repeating.monthly')}</SelectItem>
                <SelectItem value="every_year">{t('repeating.yearly')}</SelectItem>
                <SelectItem value="every_year_some_day">{t('repeating.yearly_some_day')}</SelectItem>
                <SelectItem value="lunar_calendar_every_year">{t('repeating.lunar')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval (except lunar) */}
          {interval !== null && (
            <div>
              <label className="block text-xs text-muted-foreground">{t('repeating.interval')}</label>
              <Input
                type="number"
                min={1}
                className="mt-1 w-20"
                value={interval}
                onChange={e => {
                  const opt = { ...option, interval: Math.max(1, Number(e.target.value) || 1) } as RepeatingOption
                  setOption(opt)
                  emit(opt)
                }}
              />
            </div>
          )}

          {/* Weekly: day of week checkboxes (Mon–Sun) */}
          {weekOption && (
            <div>
              <p className="text-xs text-muted-foreground">{t('repeating.day_of_week')}</p>
              <div className="mt-1 flex gap-2">
                {DAY_ORDER.map(i => (
                  <div key={i} className="flex flex-col items-center gap-1 text-xs">
                    <Checkbox
                      aria-label={DAY_FULL_LABELS[i]}
                      checked={weekOption.dayOfWeek.includes(i)}
                      onCheckedChange={() => {
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

          {/* Monthly: days/week mode */}
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
                  <label className="block text-xs text-muted-foreground">{t('repeating.date_label')}</label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    className="mt-1 w-20"
                    value={
                      'days' in monthOption.monthDaySelection
                        ? monthOption.monthDaySelection.days[0]
                        : 1
                    }
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
                    <label className="block text-xs text-muted-foreground" htmlFor="month-week-seq">{t('repeating.week_seq')}</label>
                    <Input
                      id="month-week-seq"
                      type="number"
                      min={1}
                      max={5}
                      aria-label={t('repeating.week_seq')}
                      className="mt-1 w-20"
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
                    <p className="text-xs text-muted-foreground">{t('repeating.day_of_week')}</p>
                    <div className="mt-1 flex gap-2">
                      {DAY_ORDER.map(i => {
                        const currentDays =
                          'weekDays' in monthOption.monthDaySelection
                            ? monthOption.monthDaySelection.weekDays
                            : []
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 text-xs">
                            <Checkbox
                              aria-label={DAY_FULL_LABELS[i]}
                              checked={currentDays.includes(i)}
                              onCheckedChange={() => {
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

          {/* Yearly: month + week ordinal + day of week */}
          {yearOption && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-muted-foreground" htmlFor="year-month">{t('repeating.month_label')}</label>
                <Input
                  id="year-month"
                  type="number"
                  min={1}
                  max={12}
                  aria-label={t('repeating.month_label')}
                  className="mt-1 w-20"
                  value={yearOption.months[0] ?? 1}
                  onChange={e => {
                    const opt: RepeatingOption = { ...yearOption, months: [Number(e.target.value)] }
                    setOption(opt)
                    emit(opt)
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground" htmlFor="year-week-seq">{t('repeating.week_seq')}</label>
                <Input
                  id="year-week-seq"
                  type="number"
                  min={1}
                  max={5}
                  aria-label={t('repeating.week_seq')}
                  className="mt-1 w-20"
                  value={
                    yearOption.weekOrdinals.length > 0
                      ? (yearOption.weekOrdinals[0].seq ?? 1)
                      : 1
                  }
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
                <p className="text-xs text-muted-foreground">{t('repeating.day_of_week')}</p>
                <div className="mt-1 flex gap-2">
                  {DAY_ORDER.map(i => (
                    <div key={i} className="flex flex-col items-center gap-1 text-xs">
                      <Checkbox
                        aria-label={DAY_FULL_LABELS[i]}
                        checked={yearOption.dayOfWeek.includes(i)}
                        onCheckedChange={() => {
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

          {/* Yearly some day / Lunar: month + day inputs */}
          {specificDayOption && (
            <div className="flex gap-3">
              <div>
                <label className="block text-xs text-muted-foreground">{t('repeating.month_label')}</label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  className="mt-1 w-16"
                  value={specificDayOption.month}
                  onChange={e => {
                    const opt = { ...specificDayOption, month: Number(e.target.value) } as RepeatingOption
                    setOption(opt)
                    emit(opt)
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">{t('repeating.day_label')}</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-16"
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

          {/* End condition */}
          <div>
            <label className="block text-xs text-muted-foreground">{t('repeating.end_condition')}</label>
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
                className="mt-2 rounded border border-input bg-transparent px-2 py-1 text-sm"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value)
                  emitWithEnd(option, endType, e.target.value, endCount)
                }}
              />
            )}
            {endType === 'count' && (
              <Input
                type="number"
                min={1}
                className="mt-2 w-20"
                value={endCount}
                onChange={e => {
                  setEndCount(Number(e.target.value))
                  emitWithEnd(option, endType, endDate, Number(e.target.value))
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
