import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { ColorPalette, PRESET_COLORS } from '../../../components/ColorPalette'
import { useToastStore } from '../../../stores/toastStore'
import { DeleteTagDialog } from './DeleteTagDialog'
import { useTagManagementViewModel } from '../useTagManagementViewModel'
import type { TagRowModel } from '../../../domain/tag/buildTagRows'
import {
  settingsBtnPrimary,
  settingsBtnDanger,
  settingsInput,
  settingsLabel,
} from '../../settings/SettingsSection'

export type TagEditPanelMode =
  | { kind: 'create' }
  | { kind: 'edit'; row: TagRowModel }

interface TagEditPanelProps {
  mode: TagEditPanelMode
  onClose: () => void
}

export function TagEditPanel({ mode, onClose }: TagEditPanelProps) {
  const { t } = useTranslation()
  const vm = useTagManagementViewModel()

  const initialName = mode.kind === 'edit' ? mode.row.name : ''
  const initialColor = mode.kind === 'edit' ? mode.row.color : PRESET_COLORS[0]

  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const isReadonlyName = mode.kind === 'edit' && (mode.row.kind === 'default' || mode.row.kind === 'holiday')
  const canDelete = mode.kind === 'edit' && mode.row.kind === 'custom'
  const title = mode.kind === 'create' ? t('tag.new', '새 태그') : t('tag.edit', '태그 편집')

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      if (mode.kind === 'create') {
        if (!name.trim()) { setSaving(false); return }
        await vm.createTag(name.trim(), color)
      } else if (mode.row.kind === 'default' || mode.row.kind === 'holiday') {
        await vm.updateDefaultTagColor(mode.row.kind, color)
      } else {
        if (!name.trim()) { setSaving(false); return }
        await vm.updateTag(mode.row.id, { name: name.trim(), color_hex: color })
      }
      onClose()
    } catch (e) {
      console.warn('태그 저장 실패:', e)
      const key = mode.kind === 'create'
        ? 'tag.create_failed'
        : isReadonlyName
          ? 'tag.color_update_failed'
          : 'tag.update_failed'
      useToastStore.getState().show(key, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTagOnly() {
    if (mode.kind !== 'edit' || mode.row.kind !== 'custom') return
    try {
      await vm.deleteTag(mode.row.id)
      vm.removeTagFromFilter(mode.row.id)
      setShowDelete(false)
      onClose()
    } catch (e) {
      console.warn('태그 삭제 실패:', e)
      useToastStore.getState().show('tag.delete_failed', 'error')
    }
  }

  async function handleDeleteWithEvents() {
    if (mode.kind !== 'edit' || mode.row.kind !== 'custom') return
    try {
      await vm.deleteTagAndEvents(mode.row.id)
      vm.removeTagFromFilter(mode.row.id)
      setShowDelete(false)
      onClose()
    } catch (e) {
      console.warn('태그+이벤트 삭제 실패:', e)
      useToastStore.getState().show('tag.delete_events_failed', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('tag.close_panel', 'Close panel')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-fg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-lg font-semibold text-fg">{title}</h2>
      </div>

      <div className="space-y-2">
        <label className={settingsLabel} htmlFor="tag-edit-name">
          {t('tag.name_label', '이름')}
        </label>
        <input
          id="tag-edit-name"
          className={`${settingsInput} read-only:bg-gray-50 read-only:text-fg-secondary`}
          value={name}
          onChange={e => setName(e.target.value)}
          readOnly={isReadonlyName}
          placeholder={t('tag.new_placeholder', '새 태그 이름')}
        />
        {isReadonlyName && (
          <p className="text-xs text-fg-tertiary">
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
