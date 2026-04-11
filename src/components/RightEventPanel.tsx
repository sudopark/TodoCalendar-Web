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
  const { t, i18n } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  return (
    <div className="w-80 shrink-0 border-l border-border-calendar bg-surface-alt flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-bold text-text-primary mb-6">{t('main.events_title')}</h1>
          {foremostEvent && (
            <div className="mb-4">
              <ForemostEventBanner />
            </div>
          )}
          <UncompletedTodoList />
          <CurrentTodoList showHeader={false} />
          {selectedDate && (
            <section>
              <h2 className="px-3 py-2 text-sm font-semibold text-gray-700">
                {selectedDate.toLocaleDateString(dateLocale, {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </h2>
              <DayEventList selectedDate={selectedDate} />
            </section>
          )}
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t border-border-calendar">
        <QuickTodoInput />
        <CreateEventButton />
      </div>
    </div>
  )
}
