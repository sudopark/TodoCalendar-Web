import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../../stores/authStore'
import { useToastStore } from '../../../stores/toastStore'
import { accountApi } from '../../../api/accountApi'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { SettingsSection, settingsBtnSecondary, settingsBtnDanger } from '../SettingsSection'
import { useRepositories } from '../../../composition/RepositoriesProvider'

export function AccountSection() {
  const { t } = useTranslation()
  const account = useAuthStore(s => s.account)
  const { authRepo } = useRepositories()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await accountApi.deleteAccount()
      useToastStore.getState().show(t('settings.account_deleted'), 'success')
      await authRepo.signOut()
    } catch (e) {
      console.warn('계정 삭제 실패:', e)
      useToastStore.getState().show(t('settings.account_delete_failed'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-10">
      <SettingsSection title={t('settings.account')}>
        {account && (
          <p className="text-sm text-[#6b6b6b]">{account.email ?? account.uid}</p>
        )}
        <div>
          <button className={settingsBtnSecondary} onClick={() => authRepo.signOut()}>
            {t('settings.logout')}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.danger')} tone="danger">
        <div>
          <button
            className={settingsBtnDanger}
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
          >
            {t('settings.delete_account')}
          </button>
        </div>
      </SettingsSection>

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
