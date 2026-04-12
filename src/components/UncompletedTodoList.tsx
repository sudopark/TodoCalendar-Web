import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useUncompletedTodosStore } from '../stores/uncompletedTodosStore'
import { useCalendarEventsStore } from '../stores/calendarEventsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useTagFilterStore } from '../stores/tagFilterStore'
import { useTagName } from '../hooks/useTagName'
import { RepeatingScopeDialog, type RepeatScope } from './RepeatingScopeDialog'
import { nextRepeatingTime, getStartTimestamp } from '../utils/repeatingTimeCalculator'
import { refreshAllTodoStores } from '../utils/todoActions'
import type { Todo } from '../models'

export function UncompletedTodoList() {
  const { t } = useTranslation()
  const todos = useUncompletedTodosStore(s => s.todos)
  const reload = useUncompletedTodosStore(s => s.fetch)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)
  const { isTagHidden } = useTagFilterStore()
  const getTagName = useTagName()
  const navigate = useNavigate()
  const location = useLocation()
  const [scopeTarget, setScopeTarget] = useState<Todo | null>(null)

  async function handleComplete(todo: Todo) {
    if (todo.repeating && todo.event_time) {
      setScopeTarget(todo)
      return
    }
    await doComplete(todo)
  }

  async function doComplete(todo: Todo, scope?: RepeatScope) {
    const { removeTodo } = useUncompletedTodosStore.getState()
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
      <div className="flex items-center justify-between px-1 py-2">
        <h3 className="text-[22px] font-semibold text-[#323232]">
          {t('todo.uncompleted')}
        </h3>
        <button
          onClick={() => reload()}
          className="text-[#969696] hover:text-[#646464] transition-colors"
          aria-label="refresh"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
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

              {/* 이벤트 정보 - 미완료 todo는 빨간색 */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-[#ea4444]">{todo.name}</p>
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
