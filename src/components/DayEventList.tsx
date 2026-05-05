import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../domain/functions/tagDisplay'
import { TimeDescription } from './TimeDescription'
import { RepeatingScopeDialog, type RepeatScope } from './RepeatingScopeDialog'
import { formatDateKey } from '../domain/functions/eventTime'
import { useSettingsCache } from '../repositories/caches/settingsCache'
import { useRepositories } from '../composition/RepositoriesProvider'
import type { CalendarEvent } from '../domain/functions/eventTime'
import type { Todo } from '../models'

function EventItem({ calEvent, onEventClick, onComplete, isLast }: {
  calEvent: CalendarEvent
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
  onComplete: (todo: Todo) => void
  isLast: boolean
}) {
  const { t } = useTranslation()
  const fontSizeWeight = useSettingsCache(s => s.calendarAppearance.eventListFontSizeWeight)
  const nameFontSize = `${14 + fontSizeWeight}px`

  const { name, event_tag_id, event_time } = calEvent.type === 'todo'
    ? { ...calEvent.event, event_time: calEvent.event.event_time ?? undefined }
    : { ...calEvent.event, event_time: calEvent.event.event_time }

  const resolved = useResolvedEventTag(event_tag_id)
  const color = resolved.color
  const tagName = tagDisplayName(resolved, t)

  return (
    <div
      className={`flex gap-3 cursor-pointer group ${!isLast ? 'pb-5' : ''}`}
      onClick={(e) => onEventClick(calEvent, e.currentTarget.getBoundingClientRect())}
    >
      {/* 타임라인: 도트 + 연결선 */}
      <div className="flex flex-col items-center shrink-0 w-3">
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5 ring-2 ring-surface group-hover:scale-125 transition-transform duration-150"
          style={{ backgroundColor: color }}
        />
        {!isLast && (
          <div className="flex-1 w-px bg-line mt-1.5" />
        )}
      </div>

      {/* 이벤트 내용 */}
      <div className="flex-1 min-w-0 py-0.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="truncate font-semibold text-fg leading-snug group-hover:text-fg transition-colors duration-150"
            style={{ fontSize: nameFontSize }}
          >{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-fg-quaternary leading-none">
              <TimeDescription eventTime={event_time} />
            </span>
            {tagName && (
              <span
                className="shrink-0 text-meta font-semibold px-1.5 py-0.5 rounded-full leading-none"
                style={{ color, backgroundColor: `${color}22` }}
              >
                {tagName}
              </span>
            )}
          </div>
        </div>

        {calEvent.type === 'todo' && (
          <button
            aria-label={name}
            className="shrink-0 h-5 w-5 rounded-full border-2 border-line-strong hover:border-fg transition-colors mt-0.5"
            onClick={(e) => { e.stopPropagation(); onComplete(calEvent.event) }}
          />
        )}
      </div>
    </div>
  )
}

export interface DayEventListProps {
  selectedDate: Date | null
  eventsByDate: Map<string, CalendarEvent[]>
  isTagHidden: (tagId: string | null | undefined) => boolean
  onEventClick: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function DayEventList({ selectedDate, eventsByDate, isTagHidden, onEventClick }: DayEventListProps) {
  const { t } = useTranslation()
  const { eventRepo } = useRepositories()
  const [scopeTarget, setScopeTarget] = useState<Todo | null>(null)

  async function handleComplete(todo: Todo) {
    if (todo.repeating && todo.event_time) {
      setScopeTarget(todo)
      return
    }
    await doComplete(todo)
  }

  async function doComplete(todo: Todo, scope?: RepeatScope) {
    try {
      await eventRepo.completeTodo(todo, scope)
    } catch (e) {
      console.warn('완료 처리 실패:', e)
    }
  }

  async function handleCompleteWithScope(scope: RepeatScope) {
    if (!scopeTarget) return
    const todo = scopeTarget
    setScopeTarget(null)
    await doComplete(todo, scope)
  }

  if (!selectedDate) return null

  const dateKey = formatDateKey(selectedDate)
  const allEvents = (eventsByDate.get(dateKey) ?? []).filter(ev => !isTagHidden(ev.event.event_tag_id))

  const getTimestamp = (ev: CalendarEvent): number => {
    const et = ev.type === 'todo' ? ev.event.event_time : ev.event.event_time
    if (!et) return Infinity
    if (et.time_type === 'at') return et.timestamp
    return et.period_start
  }

  const sorted = [...allEvents].sort((a, b) => getTimestamp(a) - getTimestamp(b))

  return (
    <>
      <div className="flex flex-col">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-fg-tertiary">
            {t('event.no_events')}
          </div>
        ) : (
          sorted.map((calEvent, i) => (
            <EventItem
              key={`${calEvent.event.uuid}-${i}`}
              calEvent={calEvent}
              onEventClick={onEventClick}
              onComplete={handleComplete}
              isLast={i === sorted.length - 1}
            />
          ))
        )}
      </div>

      {scopeTarget && (
        <RepeatingScopeDialog
          mode="complete"
          eventType="todo"
          onSelect={handleCompleteWithScope}
          onCancel={() => setScopeTarget(null)}
        />
      )}
    </>
  )
}
