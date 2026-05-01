import { useTranslation } from 'react-i18next'
import { Plus, ChevronLeft } from 'lucide-react'

interface Props {
  onCreate: () => void
  onClose: () => void
}

export function TagListHeader({ onCreate, onClose }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 mb-6">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('tag.close_page', '태그 관리 닫기')}
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="flex-1 text-lg font-semibold text-fg">
        {t('tag.event_types', '이벤트 종류')}
      </h2>
      <button
        type="button"
        onClick={onCreate}
        aria-label={t('tag.add_new', '새 태그 추가')}
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg-quaternary hover:text-fg hover:bg-surface-elevated transition-colors"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}
