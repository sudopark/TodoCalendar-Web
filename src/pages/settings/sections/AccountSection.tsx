import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../stores/authStore'
import { useToastStore } from '../../../stores/toastStore'
import { accountApi } from '../../../api/accountApi'
import { ConfirmDialog } from '../../../components/ConfirmDialog'

export function AccountSection() {
  const { t } = useTranslation()
  const account = useAuthStore(s => s.account)
  const signOut = useAuthStore(s => s.signOut)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await accountApi.deleteAccount()
      useToastStore.getState().show(t('settings.account_deleted'), 'success')
      await signOut()
    } catch (e) {
      console.warn('계정 삭제 실패:', e)
      useToastStore.getState().show(t('settings.account_delete_failed'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.account')}</h2>
        {account && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{account.email ?? account.uid}</p>
        )}
        <button
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={signOut}
        >
          {t('settings.logout')}
        </button>
      </section>

      <section className="rounded-xl border border-red-100 dark:border-red-900 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-red-500">{t('settings.danger')}</h2>
        <button
          className="rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
        >
          {t('settings.delete_account')}
        </button>
      </section>

      {showDeleteConfirm && (
        <ConfirmDialog
          message={t('settings.delete_account_confirm')}
          danger
          onConfirm={async () => {
            setShowDeleteConfirm(false)
            await handleDeleteAccount()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
