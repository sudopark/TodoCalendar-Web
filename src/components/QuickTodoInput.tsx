import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { useToastStore } from '../stores/toastStore'

export function QuickTodoInput() {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const defaultTagId = useEventDefaultsStore(s => s.defaultTagId)

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const trimmed = value.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      const created = await todoApi.createTodo({
        name: trimmed,
        event_tag_id: defaultTagId ?? undefined,
        is_current: true,
      })
      useCurrentTodosStore.getState().addTodo(created)
      setValue('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      useToastStore.getState().show(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <svg className="h-5 w-5 shrink-0 text-text-secondary dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
      </svg>
      <input
        className="flex-1 bg-transparent text-sm text-text-primary dark:text-gray-200 placeholder:text-text-secondary dark:placeholder:text-gray-500 outline-none"
        placeholder={t('main.quick_todo_placeholder', 'Add a new task...')}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
      />
    </div>
  )
}
