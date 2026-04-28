import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { useUiStore } from '../stores/uiStore'
import { formatDateKey } from '../domain/functions/eventTime'
import type { CalendarEvent } from '../domain/functions/eventTime'
import { useForemostEventCache } from '../repositories/caches/foremostEventCache'
import { useHolidayCache } from '../repositories/caches/holidayCache'
import { useSettingsCache } from '../repositories/caches/settingsCache'
import { ForemostEventBanner } from './ForemostEventBanner'
import { UncompletedTodoList } from './UncompletedTodoList'
import { CurrentTodoList } from './CurrentTodoList'
import { DayEventList } from './DayEventList'
import { QuickTodoInput } from './QuickTodoInput'
import { CreateEventButton } from './CreateEventButton'
import { ArchivePanel } from './ArchivePanel'

function formatLunarDate(date: Date, locale: string): string | null {
  try {
    const fmt = new Intl.DateTimeFormat(`${locale}-u-ca-chinese`, { month: 'long', day: 'numeric' })
    return fmt.format(date)
  } catch {
    return null
  }
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#bbb] shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

interface RightEventPanelProps {
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function RightEventPanel({ onEventClick }: RightEventPanelProps) {
  const { t, i18n } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventCache(s => s.foremostEvent)
  const toggleRightPanel = useUiStore(s => s.toggleRightPanel)
  const rightPanelMode = useUiStore(s => s.rightPanelMode)
  const openArchivePanel = useUiStore(s => s.openArchivePanel)
  const getHolidayNames = useHolidayCache(s => s.getHolidayNames)
  const showHolidayInEventList = useSettingsCache(s => s.calendarAppearance.showHolidayInEventList)
  const showLunarCalendar = useSettingsCache(s => s.calendarAppearance.showLunarCalendar)
  const showUncompletedTodos = useSettingsCache(s => s.calendarAppearance.showUncompletedTodos)
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  if (rightPanelMode === 'archive') {
    return <ArchivePanel />
  }

  const dateTitle = selectedDate
    ? selectedDate.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const weekdayText = selectedDate
    ? selectedDate.toLocaleDateString(dateLocale, { weekday: 'long' })
    : ''
  const holidayNames = selectedDate ? getHolidayNames(formatDateKey(selectedDate)) : []
  const lunarText = selectedDate && showLunarCalendar ? formatLunarDate(selectedDate, dateLocale) : null

  return (
    <div className="w-full h-full flex flex-col bg-white relative">
      {/* 우상단 액션 — 아카이브 진입 + 패널 닫기 */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-0.5">
        <button
          onClick={openArchivePanel}
          aria-label={t('todo.done_list', '완료된 할 일')}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <button
          onClick={toggleRightPanel}
          aria-label={t('common.close', '패널 닫기')}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 pt-2 pb-4 flex flex-col">
          {/* 날짜 헤더 — 우측 padding으로 X 버튼 영역 회피 */}
          {selectedDate && (
            <div className="mb-6 pr-20">
              <h1 className="text-2xl font-bold text-[#323232]">{dateTitle}</h1>
              <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                <p className="text-sm text-[#969696]">{weekdayText}</p>
                {lunarText && (
                  <p className="text-sm text-[#969696]">· {t('settings.lunar_prefix', '음력')} {lunarText}</p>
                )}
              </div>
              {showHolidayInEventList && holidayNames.length > 0 && (
                <p className="mt-1 text-sm text-red-400 font-medium">{holidayNames.join(', ')}</p>
              )}
            </div>
          )}

          {foremostEvent?.event && (
            <div className="mb-6">
              <SectionHeader label={t('event.foremost', 'Foremost')} />
              <ForemostEventBanner onEventClick={onEventClick} />
            </div>
          )}

          {showUncompletedTodos && <UncompletedTodoList onEventClick={onEventClick} />}

          <CurrentTodoList onEventClick={onEventClick} />

          {/* 이벤트 섹션 */}
          {selectedDate && (
            <div>
              <SectionHeader label={t('main.events_title', 'Events')} />
              <DayEventList selectedDate={selectedDate} onEventClick={onEventClick} />
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 */}
      <div className="shrink-0 border-t border-border-calendar p-4 flex flex-col gap-2">
        <QuickTodoInput />
        <CreateEventButton />
      </div>
    </div>
  )
}
