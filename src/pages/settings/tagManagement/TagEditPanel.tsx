import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { ColorPalette, PRESET_COLORS } from '../../../components/ColorPalette'
import { useEventTagListCache } from '../../../repositories/caches/eventTagListCache'
import { useTagFilterStore } from '../../../stores/tagFilterStore'
import { useToastStore } from '../../../stores/toastStore'
import { DeleteTagDialog } from './DeleteTagDialog'
import type { TagRowModel } from '../../../domain/tag/buildTagRows'
import {
  settingsBtnPrimary,
  settingsBtnDanger,
  settingsInput,
  settingsLabel,
} from '../SettingsSection'

export type TagEditPanelMode =
  | { kind: 'create' }
  | { kind: 'edit'; row: TagRowModel }

interface TagEditPanelProps {
  mode: TagEditPanelMode
  onBack: () => void
}

export function TagEditPanel({ mode, onBack }: TagEditPanelProps) {
  const { t } = useTranslation()
  const initialName = mode.kind === 'edit' ? mode.row.name : ''
  const initialColor = mode.kind === 'edit' ? mode.row.color : PRESET_COLORS[0]

  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const createTag = useEventTagListCache(s => s.createTag)
  const updateTag = useEventTagListCache(s => s.updateTag)
  const updateDefaultTagColor = useEventTagListCache(s => s.updateDefaultTagColor)
  const deleteTag = useEventTagListCache(s => s.deleteTag)
  const deleteTagAndEvents = useEventTagListCache(s => s.deleteTagAndEvents)
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
      onBack()
    } catch (e) {
      console.warn('태그 저장 실패:', e)
      const key = mode.kind === 'create'
        ? 'tag.create_failed'
        : isReadonlyName
          ? 'tag.color_update_failed'
          : 'tag.update_failed'
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
      onBack()
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
      onBack()
    } catch (e) {
      console.warn('태그+이벤트 삭제 실패:', e)
      useToastStore.getState().show(t('tag.delete_events_failed'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('tag.close_panel', 'Close panel')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-[#1f1f1f] hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-[#1f1f1f]">{title}</h2>
      </div>

      <div className="space-y-2">
        <label className={settingsLabel} htmlFor="tag-edit-name">
          {t('tag.name_label', '이름')}
        </label>
        <input
          id="tag-edit-name"
          className={`${settingsInput} read-only:bg-gray-50 read-only:text-[#6b6b6b]`}
          value={name}
          onChange={e => setName(e.target.value)}
          readOnly={isReadonlyName}
          placeholder={t('tag.new_placeholder', '새 태그 이름')}
        />
        {isReadonlyName && (
          <p className="text-xs text-[#969696]">
            {t('tag.readonly_name_notice', '기본 태그 이름은 변경할 수 없습니다')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className={settingsLabel}>{t('tag.color_label', '색상')}</p>
        <ColorPalette selected={color} onChange={setColor} />
      </div>

      <div className="flex items-center gap-2 pt-2">
        {canDelete && (
          <button
            type="button"
            className={settingsBtnDanger}
            onClick={() => setShowDelete(true)}
          >
            {t('common.delete', '삭제')}
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          className={`${settingsBtnPrimary} ml-auto`}
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
