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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-surface-elevated border border-line p-6 shadow-xl">
        <h2 className="text-base font-semibold text-fg">{t('tag.delete_title')}</h2>
        <p className="mt-2 text-sm text-fg-secondary">
          {t('tag.delete_message', { name: tagName })}
        </p>
        <div className="mt-4 flex flex-col divide-y divide-line">
          <button
            type="button"
            className="px-4 py-3 text-left text-sm text-fg hover:bg-surface-sunken transition-colors"
            onClick={onDeleteTagOnly}
          >
            {t('tag.delete_tag_only')}
          </button>
          <button
            type="button"
            className="px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
            onClick={onDeleteTagAndEvents}
          >
            {t('tag.delete_tag_and_events')}
          </button>
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-fg-secondary hover:bg-surface-sunken transition-colors"
          onClick={onCancel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
