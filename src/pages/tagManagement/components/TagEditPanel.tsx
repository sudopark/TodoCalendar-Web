import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ColorPalette, PRESET_COLORS } from '../../../components/ColorPalette'
import { useEventTagStore } from '../../../stores/eventTagStore'
import { useTagFilterStore } from '../../../stores/tagFilterStore'
import { useToastStore } from '../../../stores/toastStore'
import { DeleteTagDialog } from './DeleteTagDialog'
import type { TagRowModel } from '../../../domain/tag/buildTagRows'

export type TagEditPanelMode =
  | { kind: 'create' }
  | { kind: 'edit'; row: TagRowModel }

interface TagEditPanelProps {
  mode: TagEditPanelMode
  onClose: () => void
}

export function TagEditPanel({ mode, onClose }: TagEditPanelProps) {
  const { t } = useTranslation()
  const initialName = mode.kind === 'edit' ? mode.row.name : ''
  const initialColor = mode.kind === 'edit' ? mode.row.color : PRESET_COLORS[0]

  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const createTag = useEventTagStore(s => s.createTag)
  const updateTag = useEventTagStore(s => s.updateTag)
  const updateDefaultTagColor = useEventTagStore(s => s.updateDefaultTagColor)
  const deleteTag = useEventTagStore(s => s.deleteTag)
  const deleteTagAndEvents = useEventTagStore(s => s.deleteTagAndEvents)
  const removeFromFilter = useTagFilterStore(s => s.removeTag)

  const isReadonlyName = mode.kind === 'edit' && (mode.row.kind === 'default' || mode.row.kind === 'holiday')
  const canDelete = mode.kind === 'edit' && mode.row.kind === 'custom'
  const title = mode.kind === 'create' ? t('tag.new', '새 태그') : t('tag.edit', '태그 편집')

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      if (mode.kind === 'create') {
        if (!name.trim()) { setSaving(false); return }
        await createTag(name.trim(), color)
      } else if (mode.row.kind === 'default' || mode.row.kind === 'holiday') {
        await updateDefaultTagColor(mode.row.kind, color)
      } else {
        if (!name.trim()) { setSaving(false); return }
        await updateTag(mode.row.id, { name: name.trim(), color_hex: color })
      }
      onClose()
    } catch (e) {
      console.warn('태그 저장 실패:', e)
      const key = mode.kind === 'create' ? 'tag.create_failed' : isReadonlyName ? 'tag.color_update_failed' : 'tag.update_failed'
      useToastStore.getState().show(t(key), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTagOnly() {
    if (mode.kind !== 'edit' || mode.row.kind !== 'custom') return
    try {
      await deleteTag(mode.row.id)
      removeFromFilter(mode.row.id)
      setShowDelete(false)
      onClose()
    } catch (e) {
      console.warn('태그 삭제 실패:', e)
      useToastStore.getState().show(t('tag.delete_failed'), 'error')
    }
  }

  async function handleDeleteWithEvents() {
    if (mode.kind !== 'edit' || mode.row.kind !== 'custom') return
    try {
      await deleteTagAndEvents(mode.row.id)
      removeFromFilter(mode.row.id)
      setShowDelete(false)
      onClose()
    } catch (e) {
      console.warn('태그+이벤트 삭제 실패:', e)
      useToastStore.getState().show(t('tag.delete_events_failed'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <button
          type="button"
          aria-label={t('tag.close_panel', 'Close panel')}
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {t('common.cancel', '취소')}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400" htmlFor="tag-edit-name">
          {t('tag.name_label', '이름')}
        </label>
        <input
          id="tag-edit-name"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-70 read-only:bg-gray-50 read-only:text-gray-600 dark:read-only:bg-gray-800/50"
          value={name}
          onChange={e => setName(e.target.value)}
          readOnly={isReadonlyName}
          placeholder={t('tag.new_placeholder', '새 태그 이름')}
        />
        {isReadonlyName && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('tag.readonly_name_notice', '기본 태그 이름은 변경할 수 없습니다')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('tag.color_label', '색상')}</p>
        <ColorPalette selected={color} onChange={setColor} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        {canDelete && mode.kind === 'edit' && (
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={() => setShowDelete(true)}
          >
            {t('common.delete', '삭제')}
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          className="ml-auto rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
          onClick={handleSave}
        >
          {t('common.save', '저장')}
        </button>
      </div>

      {showDelete && mode.kind === 'edit' && mode.row.kind === 'custom' && (
        <DeleteTagDialog
          tagName={mode.row.name}
          onDeleteTagOnly={handleDeleteTagOnly}
          onDeleteTagAndEvents={handleDeleteWithEvents}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
