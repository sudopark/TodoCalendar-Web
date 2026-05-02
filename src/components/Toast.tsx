import { useTranslation } from 'react-i18next'
import { useToastStore } from '../stores/toastStore'

const bgColor = { success: 'bg-success', error: 'bg-danger', info: 'bg-action' }
const fgColor = { success: 'text-white', error: 'text-white', info: 'text-action-fg' }

export function ToastContainer() {
  const { t } = useTranslation()
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          data-toast-type={toast.type}
          className={`${bgColor[toast.type]} ${fgColor[toast.type]} rounded-lg px-4 py-2 text-sm shadow-lg`}
          onClick={() => dismiss(toast.id)}
        >
          {t(toast.key, toast.params as Record<string, string> | undefined)}
        </div>
      ))}
    </div>
  )
}
