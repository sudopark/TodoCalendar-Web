import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import type { CalendarEvent } from '../utils/eventTimeUtils'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { ForemostEventBanner } from './ForemostEventBanner'
import { UncompletedTodoList } from './UncompletedTodoList'
import { CurrentTodoList } from './CurrentTodoList'
import { DayEventList } from './DayEventList'
import { QuickTodoInput } from './QuickTodoInput'
import { CreateEventButton } from './CreateEventButton'
import { ScrollArea } from '@/components/ui/scroll-area'

interface RightEventPanelProps {
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function RightEventPanel({ onEventClick }: RightEventPanelProps) {
  const { t, i18n } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const toggleRightPanel = useUiStore(s => s.toggleRightPanel)
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  const dateTitle = selectedDate
    ? selectedDate.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const weekdayText = selectedDate
    ? selectedDate.toLocaleDateString(dateLocale, { weekday: 'long' })
    : ''

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-border-calendar shadow-lg">
      {/* 닫기 버튼 */}
      <div className="flex items-center justify-end px-3 pt-3">
        <button
          onClick={toggleRightPanel}
          aria-label="패널 닫기"
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 스크롤 영역 */}
      <ScrollArea className="flex-1">
        <div className="px-6 pb-4 flex flex-col">
          {/* 날짜 헤더 */}
          {selectedDate && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#323232]">{dateTitle}</h1>
              <p className="text-sm text-[#969696] mt-0.5">{weekdayText}</p>
            </div>
          )}

          {foremostEvent && (
            <div className="mb-4">
              <ForemostEventBanner />
            </div>
          )}

          <UncompletedTodoList />

          {/* TODO 섹션 */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-[#969696] mb-2">Current Todo</h3>
            <div className="border-t border-border-calendar pt-2">
              <CurrentTodoList showHeader={false} onEventClick={onEventClick} />
            </div>
          </div>

          {/* 이벤트 섹션 */}
          {selectedDate && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#969696] mb-2">
                {t('main.events_title', '이벤트')}
              </h3>
              <div className="border-t border-border-calendar pt-2">
                <DayEventList selectedDate={selectedDate} onEventClick={onEventClick} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 하단 고정 */}
      <div className="shrink-0 border-t border-border-calendar p-4 flex flex-col gap-2">
        <QuickTodoInput />
        <CreateEventButton />
      </div>
    </div>
  )
}
