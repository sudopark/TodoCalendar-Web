import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useUncompletedTodosCache } from '../repositories/caches/uncompletedTodosCache'
import { useCalendarEventsCache } from '../repositories/caches/calendarEventsCache'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../domain/functions/tagDisplay'
import { RepeatingScopeDialog, type RepeatScope } from './RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../domain/functions/repeating'
import { refreshAllTodoStores } from '../utils/todoActions'
import { useSettingsCache } from '../repositories/caches/settingsCache'
import type { Todo } from '../models'
import type { CalendarEvent } from '../domain/functions/eventTime'

interface UncompletedTodoRowProps {
  todo: Todo
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
  onComplete: (todo: Todo) => void
  isLast: boolean
}

function UncompletedTodoRow({ todo, onEventClick, onComplete, isLast }: UncompletedTodoRowProps) {
  const { t } = useTranslation()
  const resolved = useResolvedEventTag(todo.event_tag_id)
  const color = resolved.color
  const fontSizeWeight = useSettingsCache(s => s.calendarAppearance.eventListFontSizeWeight)
  const nameFontSize = `${14 + fontSizeWeight}px`
  const tagName = tagDisplayName(resolved, t)

  return (
    <div
      className={`flex gap-3 cursor-pointer group ${!isLast ? 'pb-5' : ''}`}
      onClick={(e) => onEventClick?.({ type: 'todo', event: todo }, e.currentTarget.getBoundingClientRect())}
    >
      {/* 타임라인: 도트 + 연결선 */}
      <div className="flex flex-col items-center shrink-0 w-3">
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5 ring-2 ring-white group-hover:scale-125 transition-transform duration-150"
          style={{ backgroundColor: color }}
        />
        {!isLast && (
          <div className="flex-1 w-px bg-gray-200 mt-1.5" />
        )}
      </div>

      {/* 이벤트 내용 + 완료 버튼 */}
      <div className="flex-1 min-w-0 py-0.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="truncate font-semibold text-[#ea4444] leading-snug"
            style={{ fontSize: nameFontSize }}
          >{todo.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-[#aaa] leading-none">Todo</span>
            {tagName && (
              <span
                className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                style={{ color, backgroundColor: `${color}22` }}
              >
                {tagName}
              </span>
            )}
          </div>
        </div>
        <button
          aria-label={todo.name}
          className="shrink-0 h-5 w-5 rounded-full border-2 border-[#ccd0dc] hover:border-[#323232] transition-colors mt-0.5"
          onClick={(e) => { e.stopPropagation(); onComplete(todo) }}
        />
      </div>
    </div>
  )
}

interface UncompletedTodoListProps {
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function UncompletedTodoList({ onEventClick }: UncompletedTodoListProps) {
  const { t } = useTranslation()
  const todos = useUncompletedTodosCache(s => s.todos)
  const reload = useUncompletedTodosCache(s => s.fetch)
  const { isTagHidden } = useTagFilterStore()
  const [scopeTarget, setScopeTarget] = useState<Todo | null>(null)

  async function handleComplete(todo: Todo) {
    if (todo.repeating && todo.event_time) {
      setScopeTarget(todo)
      return
    }
    await doComplete(todo)
  }

  async function doComplete(todo: Todo, scope?: RepeatScope) {
    const { removeTodo } = useUncompletedTodosCache.getState()
    const { removeEvent } = useCalendarEventsCache.getState()
    try {
      if (scope === 'this' && todo.repeating && todo.event_time) {
        const next = nextRepeatingTime(todo.event_time, todo.repeating_turn ?? 1, todo.repeating, todo.exclude_repeatings)
        await todoApi.completeTodo(todo.uuid, { origin: todo, next_event_time: next?.time, next_repeating_turn: next?.turn })
      } else if (scope === 'future') {
        const startTs = getStartTimestamp(todo.event_time!)
        await todoApi.patchTodo(todo.uuid, { repeating: { ...todo.repeating, end: startTs - 1 } })
        await todoApi.completeTodo(todo.uuid, { origin: todo })
      } else {
        await todoApi.completeTodo(todo.uuid, { origin: todo })
      }

      if (todo.repeating) {
        await refreshAllTodoStores()
      } else {
        removeEvent(todo.uuid)
        removeTodo(todo.uuid)
      }
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

  const visibleTodos = todos.filter(t => !isTagHidden(t.event_tag_id))

  if (visibleTodos.length === 0) return null

  return (
    <section className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#bbb] shrink-0">
          {t('todo.uncompleted')}
        </span>
        <div className="flex-1 h-px bg-gray-100" />
        <button
          onClick={() => reload()}
          className="shrink-0 text-[#ccc] hover:text-[#999] transition-colors"
          aria-label="refresh"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col">
        {visibleTodos.map((todo, i) => (
          <UncompletedTodoRow
            key={todo.uuid}
            todo={todo}
            onEventClick={onEventClick}
            onComplete={handleComplete}
            isLast={i === visibleTodos.length - 1}
          />
        ))}
      </div>
      {scopeTarget && (
        <RepeatingScopeDialog
          mode="complete"
          eventType="todo"
          onSelect={handleCompleteWithScope}
          onCancel={() => setScopeTarget(null)}
        />
      )}
    </section>
  )
}
