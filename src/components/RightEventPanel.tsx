import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { ForemostEventBanner } from './ForemostEventBanner'
import { UncompletedTodoList } from './UncompletedTodoList'
import { CurrentTodoList } from './CurrentTodoList'
import { DayEventList } from './DayEventList'
import { QuickTodoInput } from './QuickTodoInput'
import { CreateEventButton } from './CreateEventButton'
import { ScrollArea } from '@/components/ui/scroll-area'

export function RightEventPanel() {
  const { i18n } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  return (
    <div className="w-80 shrink-0 border-l border-border-calendar bg-white flex flex-col h-full overflow-hidden">
      {/* 스크롤 영역 */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 flex flex-col gap-4">
          {foremostEvent && <ForemostEventBanner />}
          <UncompletedTodoList />
          <CurrentTodoList showHeader={false} />
          {selectedDate && (
            <section>
              <div className="flex items-center justify-between px-1 py-2">
                <h2 className="text-[22px] font-semibold text-[#323232]">
                  {selectedDate.toLocaleDateString(dateLocale, {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </h2>
              </div>
              <DayEventList selectedDate={selectedDate} />
            </section>
          )}
        </div>
      </ScrollArea>

      {/* 하단 고정 (웹 전용) */}
      <div className="shrink-0 border-t border-border-calendar p-4 flex flex-col gap-1.5">
        <QuickTodoInput />
        <CreateEventButton />
      </div>
    </div>
  )
}
