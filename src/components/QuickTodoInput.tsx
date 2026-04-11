import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { todoApi } from '../api/todoApi'
import { useCurrentTodosStore } from '../stores/currentTodosStore'
import { useEventDefaultsStore } from '../stores/eventDefaultsStore'
import { useEventTagStore } from '../stores/eventTagStore'
import { useToastStore } from '../stores/toastStore'

export function QuickTodoInput() {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focused, setFocused] = useState(false)
  const defaultTagId = useEventDefaultsStore(s => s.defaultTagId)
  const getColorForTagId = useEventTagStore(s => s.getColorForTagId)

  const tagColor = defaultTagId ? (getColorForTagId(defaultTagId) ?? '#9ca3af') : '#9ca3af'

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
    <div
      className="flex items-center gap-2 rounded-[5px] bg-[#f3f4f7] px-2 transition-opacity"
      style={{ height: 50, opacity: focused || value ? 1 : 0.5 }}
    >
      {/* 좌측 시간 영역 52px */}
      <div className="shrink-0 text-center" style={{ width: 52 }}>
        <p className="text-xs text-[#323232]">Todo</p>
      </div>

      {/* 컬러바 6px */}
      <div
        className="shrink-0 self-stretch rounded-[3px] my-2"
        style={{ width: 6, backgroundColor: tagColor }}
      />

      {/* 입력 필드 */}
      <input
        className="flex-1 bg-transparent text-sm text-[#323232] placeholder:text-[#ccd0dc] outline-none"
        placeholder={t('main.quick_todo_placeholder', 'Add a new task...')}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={submitting}
      />
    </div>
  )
}
