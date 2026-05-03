import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { formatDateKey } from '../domain/functions/eventTime'
import type { CalendarEvent } from '../domain/functions/eventTime'
import type { ForemostEvent, DoneTodo } from '../models'
import type { Todo } from '../models/Todo'
import { ForemostEventBanner } from './ForemostEventBanner'
import { UncompletedTodoList } from './UncompletedTodoList'
import { CurrentTodoList } from './CurrentTodoList'
import { DayEventList } from './DayEventList'
import { QuickTodoInput } from './QuickTodoInput'
import { CreateEventButton } from './CreateEventButton'
import { ArchivePanel } from './ArchivePanel'
import type { RightPanelMode } from '../stores/uiStore'

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
      <span className="text-section-label font-semibold uppercase tracking-widest text-fg-quaternary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  )
}

export interface RightEventPanelProps {
  selectedDate?: Date | null
  rightPanelMode?: RightPanelMode
  foremostEvent?: ForemostEvent | null
  currentTodos?: Todo[]
  uncompletedTodos?: Todo[]
  showUncompletedTodos?: boolean
  showHolidayInEventList?: boolean
  showLunarCalendar?: boolean
  eventsByDate?: Map<string, CalendarEvent[]>
  isTagHidden?: (tagId: string | null | undefined) => boolean
  getHolidayNames?: (dateKey: string) => string[]
  onReloadUncompletedTodos?: () => Promise<void>
  onToggleRightPanel?: () => void
  onOpenArchivePanel?: () => void
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
  onDoneTodoClick?: (doneTodo: DoneTodo, anchorRect: DOMRect) => void
}

export function RightEventPanel({
  selectedDate = null,
  rightPanelMode = 'dayEvents',
  foremostEvent = null,
  currentTodos = [],
  uncompletedTodos = [],
  showUncompletedTodos = true,
  showHolidayInEventList = true,
  showLunarCalendar = false,
  eventsByDate = new Map(),
  isTagHidden = () => false,
  getHolidayNames = () => [],
  onReloadUncompletedTodos = async () => {},
  onToggleRightPanel = () => {},
  onOpenArchivePanel = () => {},
  onEventClick = () => {},
  onDoneTodoClick,
}: RightEventPanelProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  if (rightPanelMode === 'archive') {
    return <ArchivePanel onDoneTodoClick={onDoneTodoClick} />
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
    <div className="w-full h-full flex flex-col bg-surface relative">
      {/* 우상단 액션 — 아카이브 진입 + 패널 닫기 */}
      <div className="absolute top-2 right-3 z-10 flex items-center gap-0.5">
        <button
          onClick={onOpenArchivePanel}
          aria-label={t('todo.done_list', '완료된 할 일')}
          className="p-1.5 rounded-full hover:bg-surface-sunken transition-colors text-fg-quaternary hover:text-fg-secondary"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleRightPanel}
          aria-label={t('common.close', '패널 닫기')}
          className="p-1.5 rounded-full hover:bg-surface-sunken transition-colors text-fg-quaternary hover:text-fg-secondary"
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
              <h1 className="text-2xl font-bold text-fg">{dateTitle}</h1>
              <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                <p className="text-sm text-fg-tertiary">{weekdayText}</p>
                {lunarText && (
                  <p className="text-sm text-fg-tertiary">· {t('settings.lunar_prefix', '음력')} {lunarText}</p>
                )}
              </div>
              {showHolidayInEventList && holidayNames.length > 0 && (
                <p className="mt-1 text-sm text-danger font-medium">{holidayNames.join(', ')}</p>
              )}
            </div>
          )}

          {foremostEvent?.event && (
            <div className="mb-6">
              <SectionHeader label={t('event.foremost', 'Foremost')} />
              <ForemostEventBanner foremostEvent={foremostEvent} onEventClick={onEventClick} />
            </div>
          )}

          {showUncompletedTodos && (
            <UncompletedTodoList
              todos={uncompletedTodos}
              isTagHidden={isTagHidden}
              onReload={onReloadUncompletedTodos}
              onEventClick={onEventClick}
            />
          )}

          <CurrentTodoList
            todos={currentTodos}
            isTagHidden={isTagHidden}
            onEventClick={onEventClick}
          />

          {/* 이벤트 섹션 */}
          {selectedDate && (
            <div>
              <SectionHeader label={t('main.events_title', 'Events')} />
              <DayEventList
                selectedDate={selectedDate}
                eventsByDate={eventsByDate}
                isTagHidden={isTagHidden}
                onEventClick={onEventClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 */}
      <div className="shrink-0 border-t border-line p-4 flex flex-col gap-2">
        <QuickTodoInput />
        <CreateEventButton />
      </div>
    </div>
  )
}
