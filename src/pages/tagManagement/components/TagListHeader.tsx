import { useTranslation } from 'react-i18next'

interface TagListHeaderProps {
  onCreate: () => void
  onClose: () => void
}

export function TagListHeader({ onCreate, onClose }: TagListHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between mb-4 gap-2">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('tag.event_types', '이벤트 종류')}</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('tag.add_new', '새 태그 추가')}
          onClick={onCreate}
          className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={t('tag.close_page', '태그 관리 닫기')}
          onClick={onClose}
          className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
