import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../utils/tagDisplay'
import { RepeatingScopeDialog, type RepeatScope } from './RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../utils/repeatingTimeCalculator'
import { refreshAllTodoStores } from '../utils/todoActions'
import type { Todo } from '../models'
import type { CalendarEvent } from '../utils/eventTimeUtils'

interface CurrentTodoRowProps {
  todo: Todo
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
  onComplete: (todo: Todo) => void
}

function CurrentTodoRow({ todo, onEventClick, onComplete }: CurrentTodoRowProps) {
  const { t } = useTranslation()
  const resolved = useResolvedEventTag(todo.event_tag_id)
  const color = resolved.color
  const tagName = tagDisplayName(resolved, t)

  return (
    <div
      className="flex items-stretch gap-2 rounded-[5px] bg-[#f3f4f7] px-3 py-2.5 hover:brightness-95 cursor-pointer"
      onClick={(e) => onEventClick?.({ type: 'todo', event: todo }, e.currentTarget.getBoundingClientRect())}
    >
      <div className="shrink-0 self-stretch rounded-full" style={{ width: 3, backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-[#323232]">{todo.name}</p>
        <p className="truncate text-xs text-[#646464]">Todo</p>
        {tagName && (
          <p className="truncate text-[11px] text-[#969696]">{tagName}</p>
        )}
      </div>
      <button
        aria-label={todo.name}
        className="shrink-0 h-5 w-5 rounded-full border-2 border-[#ccd0dc] hover:border-[#323232] transition-colors self-center"
        onClick={(e) => { e.stopPropagation(); onComplete(todo) }}
      />
    </div>
  )
}

interface CurrentTodoListProps {
  showHeader?: boolean
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function CurrentTodoList({ showHeader = true, onEventClick }: CurrentTodoListProps) {
  const todos = useCurrentTodosStore(s => s.todos)
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
    const { removeTodo } = useCurrentTodosStore.getState()
    const { removeEvent } = useCalendarEventsStore.getState()
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
    <section>
      {showHeader && (
        <h3 className="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-[#969696]">
          Current
        </h3>
      )}
      <div className="flex flex-col gap-1.5">
        {visibleTodos.map(todo => (
          <CurrentTodoRow
            key={todo.uuid}
            todo={todo}
            onEventClick={onEventClick}
            onComplete={handleComplete}
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
