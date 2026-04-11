import { useTranslation } from 'react-i18next'
import { useUiStore } from '../stores/uiStore'
import { useForemostEventStore } from '../stores/foremostEventStore'
import { ForemostEventBanner } from './ForemostEventBanner'
import { UncompletedTodoList } from './UncompletedTodoList'
import { CurrentTodoList } from './CurrentTodoList'
import { DayEventList } from './DayEventList'
import { QuickTodoInput } from './QuickTodoInput'
import { CreateEventButton } from './CreateEventButton'

export function RightEventPanel() {
  const { i18n } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)
  const foremostEvent = useForemostEventStore(s => s.foremostEvent)
  const dateLocale = i18n.language === 'en' ? 'en-US' : 'ko-KR'

  return (
    <div className="w-80 lg:w-96 border-l dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {foremostEvent && (
          <div className="mb-4">
            <ForemostEventBanner />
          </div>
        )}
        <UncompletedTodoList />
        <CurrentTodoList />
        {selectedDate && (
          <section>
            <h2 className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
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
      <div className="shrink-0">
        <QuickTodoInput />
        <CreateEventButton />
      </div>
    </div>
  )
}
