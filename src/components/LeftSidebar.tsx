import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayButton } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import CalendarList from './CalendarList'
import { Drawer } from '@/components/ui/Drawer'
import { formatDateKey } from '../domain/functions/eventTime'
import { cn } from '@/lib/utils'
import { SIDEBAR_WIDTH_CLASS } from '../constants/layout'
import { useIsMobile } from '../hooks/useIsMobile'

const WEEKDAY_KEYS = [
  'calendar.weekdays.sun',
  'calendar.weekdays.mon',
  'calendar.weekdays.tue',
  'calendar.weekdays.wed',
  'calendar.weekdays.thu',
  'calendar.weekdays.fri',
  'calendar.weekdays.sat',
] as const

const WEEKDAY_FALLBACKS = ['일', '월', '화', '수', '목', '금', '토']

const isSundayModifier = (date: Date) => date.getDay() === 0

interface MiniCalendarDayButtonProps extends React.ComponentProps<typeof DayButton> {
  getHolidayNames: (dateKey: string) => string[]
}

function MiniCalendarDayButton({
  day,
  modifiers,
  className,
  getHolidayNames,
  ...props
}: MiniCalendarDayButtonProps) {
  const isSunday = day.date.getDay() === 0
  const isHoliday = getHolidayNames(formatDateKey(day.date)).length > 0

  const isOutside = modifiers.outside
  const isToday = modifiers.today
  const isSelected = modifiers.selected

  const bgStyle = isSelected
    ? 'bg-action rounded-full'
    : isToday
      ? 'bg-surface-sunken rounded-full'
      : 'hover:bg-surface-sunken hover:rounded-full'

  const textColor = isSelected
    ? 'text-action-fg font-semibold'
    : isOutside
      ? 'text-fg-tertiary'
      : isSunday || isHoliday
        ? 'text-danger'
        : 'text-fg'

  return (
    <button
      {...props}
      className={cn(
        'flex h-7 w-7 items-center justify-center text-xs mx-auto cursor-pointer bg-transparent border-0 p-0 transition-colors',
        bgStyle,
        textColor,
        className
      )}
    />
  )
}

export interface LeftSidebarProps {
  sidebarOpen: boolean
  sidebarMonth: Date
  selectedDate: Date | null
  getHolidayNames: (dateKey: string) => string[]
  onSetSelectedDate: (date: Date) => void
  onSetSidebarMonth: (date: Date) => void
  onOpenEventForm: (rect: DOMRect | null, type: 'todo' | 'schedule') => void
  onToggleSidebar: () => void
}

export default function LeftSidebar(props: LeftSidebarProps) {
  const isMobile = useIsMobile()
  const content = <LeftSidebarContent {...props} />

  if (isMobile) {
    // Drawer는 open=true 일 때만 렌더되므로 toggle = close로 동치 — onClose에 onToggleSidebar 그대로 위임
    return (
      <Drawer open={props.sidebarOpen} onClose={props.onToggleSidebar}>
        <div className="flex h-full flex-col bg-surface-elevated px-3 pt-4 pb-4 overflow-y-auto">
          {content}
        </div>
      </Drawer>
    )
  }

  // 데스크톱: 기존 인라인 width 토글
  return (
    <div
      className={cn(
        'hidden md:flex flex-col transition-[width] duration-200 bg-surface-elevated overflow-hidden shrink-0',
        props.sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-0'
      )}
    >
      <div
        className={cn(
          'flex-1 overflow-y-auto flex flex-col px-3 pt-4 pb-4 transition-opacity duration-150',
          props.sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {content}
      </div>
    </div>
  )
}

function LeftSidebarContent({
  sidebarMonth,
  selectedDate,
  getHolidayNames,
  onSetSelectedDate,
  onSetSidebarMonth,
  onOpenEventForm,
}: Omit<LeftSidebarProps, 'sidebarOpen' | 'onToggleSidebar'>) {
  const { t } = useTranslation()
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const createButtonRef = useRef<HTMLButtonElement>(null)

  const formatWeekdayName = (date: Date) => {
    const dayIndex = date.getDay()
    return t(WEEKDAY_KEYS[dayIndex], WEEKDAY_FALLBACKS[dayIndex])
  }

  return (
    <>
      {/* Section: Create CTA */}
      <div className="relative">
        <button
          ref={createButtonRef}
          data-testid="sidebar-create-event"
          aria-haspopup="menu"
          aria-expanded={showCreateMenu}
          className="flex w-full items-center justify-between rounded-full bg-surface border border-line px-4 py-2.5 shadow-sm hover:shadow transition-shadow"
          onClick={() => setShowCreateMenu(!showCreateMenu)}
        >
          <span className="flex items-center gap-2 text-fg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">{t('main.create_event', 'Create')}</span>
          </span>
          <svg
            className={cn('h-3.5 w-3.5 text-fg-tertiary transition-transform', showCreateMenu && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCreateMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
            <div
              role="menu"
              className="absolute top-full left-0 mt-1.5 z-50 w-full overflow-hidden rounded-xl bg-surface-elevated border border-line shadow-lg"
            >
              <button
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-fg hover:bg-surface-sunken transition-colors"
                onClick={() => {
                  setShowCreateMenu(false)
                  const rect = createButtonRef.current?.getBoundingClientRect() ?? null
                  onOpenEventForm(rect, 'todo')
                }}
              >
                <svg className="h-4 w-4 text-fg-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Todo
              </button>
              <div className="border-t border-line" />
              <button
                role="menuitem"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-fg hover:bg-surface-sunken transition-colors"
                onClick={() => {
                  setShowCreateMenu(false)
                  const rect = createButtonRef.current?.getBoundingClientRect() ?? null
                  onOpenEventForm(rect, 'schedule')
                }}
              >
                <svg className="h-4 w-4 text-fg-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule
              </button>
            </div>
          </>
        )}
      </div>
      {/* Section: Mini Calendar */}
      <div className="mt-5">
        <Calendar
          className="!bg-transparent"
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(date) => date && onSetSelectedDate(date)}
          month={sidebarMonth}
          onMonthChange={onSetSidebarMonth}
          formatters={{ formatWeekdayName }}
          modifiers={{ sunday: isSundayModifier }}
          classNames={{
            root: 'w-full bg-transparent',
            months: 'relative flex flex-col gap-0',
            month: 'flex w-full flex-col gap-2',
            month_caption: 'flex h-7 w-full items-center justify-center px-7',
            caption_label: 'text-sm font-semibold text-fg select-none',
            nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between',
            button_previous: 'rounded p-0.5 hover:bg-surface-sunken text-fg-secondary h-7 w-7 flex items-center justify-center transition-colors',
            button_next: 'rounded p-0.5 hover:bg-surface-sunken text-fg-secondary h-7 w-7 flex items-center justify-center transition-colors',
            weekdays: 'flex',
            weekday: 'flex-1 text-center text-meta font-normal uppercase tracking-wide text-fg-tertiary py-1',
            week: 'mt-0.5 flex w-full',
            day: 'flex-1 flex items-center justify-center py-0.5',
            today: '',
            selected: '',
            outside: '',
          }}
          components={{
            DayButton: (props) => <MiniCalendarDayButton {...props} getHolidayNames={getHolidayNames} />,
          }}
        />
      </div>
      {/* Section: Tag Filters */}
      <div className="mt-6 flex-1">
        <CalendarList />
      </div>
    </>
  )
}
