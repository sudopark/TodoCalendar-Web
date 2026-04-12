import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore, DEFAULT_TAG_ID, HOLIDAY_TAG_ID } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { RepeatingScopeDialog, type RepeatScope } from './RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../utils/repeatingTimeCalculator'
import { refreshAllTodoStores } from '../utils/todoActions'
import type { Todo } from '../models'

interface CurrentTodoListProps {
  showHeader?: boolean
}

export function CurrentTodoList({ showHeader = true }: CurrentTodoListProps) {
  const { t } = useTranslation()
  const todos = useCurrentTodosStore(s => s.todos)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const tags = useEventTagStore(s => s.tags)
  const { isTagHidden } = useTagFilterStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [scopeTarget, setScopeTarget] = useState<Todo | null>(null)

  function getTagName(tagId: string | null | undefined): string {
    if (!tagId) return ''
    if (tagId === DEFAULT_TAG_ID) return t('tag.default_name', 'Default')
    if (tagId === HOLIDAY_TAG_ID) return t('tag.holiday_name', 'Holiday')
    return tags.get(tagId)?.name ?? ''
  }

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
        {visibleTodos.map(todo => {
          const color = todo.event_tag_id
            ? (getColorForTagId(todo.event_tag_id) ?? '#9ca3af')
            : '#9ca3af'
          const tagName = getTagName(todo.event_tag_id)
          return (
            <div
              key={todo.uuid}
              className="flex items-stretch gap-2 rounded-[5px] bg-[#f3f4f7] px-3 py-2.5 hover:brightness-95 cursor-pointer"
              onClick={() => navigate(`/events/${todo.uuid}?type=todo`, {
                state: { background: location, eventType: 'todo' },
              })}
            >
              {/* 컬러바 3px */}
              <div
                className="shrink-0 self-stretch rounded-full"
                style={{ width: 3, backgroundColor: color }}
              />

              {/* 이벤트 정보 3줄 */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-[#323232]">{todo.name}</p>
                <p className="truncate text-xs text-[#646464]">Todo</p>
                {tagName && (
                  <p className="truncate text-[11px] text-[#969696]">{tagName}</p>
                )}
              </div>

              {/* 완료 버튼 */}
              <button
                aria-label={todo.name}
                className="shrink-0 h-5 w-5 rounded-full border-2 border-[#ccd0dc] hover:border-[#323232] transition-colors self-center"
                onClick={(e) => { e.stopPropagation(); handleComplete(todo) }}
              />
            </div>
          )
        })}
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
