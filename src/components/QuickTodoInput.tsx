import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useCurrentTodosCache } from '../repositories/caches/currentTodosCache'
import { useResolvedEventTag } from '../hooks/useResolvedEventTag'
import { useToastStore } from '../stores/toastStore'

export function QuickTodoInput() {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const resolved = useResolvedEventTag(null)
  const tagColor = resolved.color

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const trimmed = value.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      const created = await todoApi.createTodo({
        name: trimmed,
        event_tag_id: undefined,
        is_current: true,
      })
      useCurrentTodosCache.getState().addTodo(created)
      setValue('')
    } catch {
      useToastStore.getState().show('error.unknown', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface border border-line px-3 py-2.5 focus-within:border-line-strong focus-within:shadow-sm transition-all duration-150">
      <div
        className="shrink-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: tagColor }}
      />
      <input
        className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-quaternary outline-none"
        placeholder={t('main.quick_todo_placeholder', 'Add a new task...')}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
      />
    </div>
  )
}
