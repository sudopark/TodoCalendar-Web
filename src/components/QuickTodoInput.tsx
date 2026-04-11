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
    <div className="flex items-center gap-3 px-6 py-4">
      <span className="h-5 w-5 rounded-full border-2 border-border-calendar shrink-0" />
      <input
        className="flex-1 bg-transparent border-none shadow-none text-sm placeholder:text-text-secondary outline-none focus-visible:ring-0 text-text-primary"
        placeholder={t('main.quick_todo_placeholder', 'Add a new task...')}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
      />
    </div>
  )
}
