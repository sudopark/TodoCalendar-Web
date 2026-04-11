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
    <div className="flex items-center gap-2 px-3 py-2 border-t dark:border-gray-700">
      <input
        className="flex-1 rounded-md border px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
        placeholder={t('main.quick_todo_placeholder', '할 일 추가...')}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
      />
    </div>
  )
}
