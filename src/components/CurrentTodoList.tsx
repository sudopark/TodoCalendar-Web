import { useTranslation } from 'react-i18next'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { tagDisplayName } from '../domain/functions/tagDisplay'
import type { RepeatScope } from './RepeatingScopeDialog'
import { useSettingsCache } from '../repositories/caches/settingsCache'
import { useRepositories } from '../composition/RepositoriesProvider'
import type { Todo } from '../models'
import type { CalendarEvent } from '../domain/functions/eventTime'
import { EventTimeDisplay } from './EventTimeDisplay'

interface CurrentTodoRowProps {
  todo: Todo
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
  onComplete: (todo: Todo) => void
  isLast: boolean
}

function CurrentTodoRow({ todo, onEventClick, onComplete, isLast }: CurrentTodoRowProps) {
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
          className="w-2 h-2 rounded-full shrink-0 mt-1.5 ring-2 ring-surface group-hover:scale-125 transition-transform duration-150"
          style={{ backgroundColor: color }}
        />
        {!isLast && (
          <div className="flex-1 w-px bg-line mt-1.5" />
        )}
      </div>

      {/* 이벤트 내용 + 완료 버튼 */}
      <div className="flex-1 min-w-0 py-0.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p
            className="truncate font-semibold text-fg leading-snug group-hover:text-fg transition-colors duration-150"
            style={{ fontSize: nameFontSize }}
          >{todo.name}</p>
          {todo.event_time && (
            <p className="text-xs text-fg-tertiary leading-snug mt-0.5">
              <EventTimeDisplay eventTime={todo.event_time} />
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-fg-quaternary leading-none">Todo</span>
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
        <button
          aria-label={todo.name}
          className="shrink-0 h-5 w-5 rounded-full border-2 border-line-strong hover:border-fg transition-colors mt-0.5"
          onClick={(e) => { e.stopPropagation(); onComplete(todo) }}
        />
      </div>
    </div>
  )
}

export interface CurrentTodoListProps {
  todos: Todo[]
  isTagHidden: (tagId: string | null | undefined) => boolean
  onEventClick?: (calEvent: CalendarEvent, anchorRect: DOMRect) => void
}

export function CurrentTodoList({ todos, isTagHidden, onEventClick }: CurrentTodoListProps) {
  const { eventRepo } = useRepositories()

  async function handleComplete(todo: Todo) {
    // 반복 할일은 차수 선택 팝업을 띄우지 않고 항상 현재 차수만 완료 + 다음 차수로 이동 (앱과 동일한 정책)
    const scope: RepeatScope | undefined = (todo.repeating && todo.event_time) ? 'this' : undefined
    await doComplete(todo, scope)
  }

  async function doComplete(todo: Todo, scope?: RepeatScope) {
    try {
      await eventRepo.completeTodo(todo, scope)
    } catch (e) {
      console.warn('완료 처리 실패:', e)
    }
  }

  const visibleTodos = todos.filter(t => !isTagHidden(t.event_tag_id))

  if (visibleTodos.length === 0) return null

  return (
    <section data-testid="current-todo-list" className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-section-label font-semibold uppercase tracking-widest text-fg-quaternary shrink-0">Current Todo</span>
        <div className="flex-1 h-px bg-line" />
      </div>
      <div className="flex flex-col">
        {visibleTodos.map((todo, i) => (
          <CurrentTodoRow
            key={todo.uuid}
            todo={todo}
            onEventClick={onEventClick}
            onComplete={handleComplete}
            isLast={i === visibleTodos.length - 1}
          />
        ))}
      </div>
    </section>
  )
}
