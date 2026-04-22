import { useTranslation } from 'react-i18next'

interface Props {
  tagName: string
  onDeleteTagOnly: () => void | Promise<void>
  onDeleteTagAndEvents: () => void | Promise<void>
  onCancel: () => void
}

export function DeleteTagDialog({ tagName, onDeleteTagOnly, onDeleteTagAndEvents, onCancel }: Props) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('tag.delete_title')}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t('tag.delete_message', { name: tagName })}
        </p>
        <div className="mt-4 flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
          <button
            className="px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={onDeleteTagOnly}
          >
            {t('tag.delete_tag_only')}
          </button>
          <button
            className="px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={onDeleteTagAndEvents}
          >
            {t('tag.delete_tag_and_events')}
          </button>
        </div>
        <button
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
