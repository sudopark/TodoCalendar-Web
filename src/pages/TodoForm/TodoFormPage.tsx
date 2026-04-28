import { useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../../stores/uiStore'
import { useToastStore } from '../../stores/toastStore'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { RepeatingScopeDialog } from '../../components/RepeatingScopeDialog'
import { EventFormHeader } from '../../components/eventForm/EventFormHeader'
import { EventTimeSection } from '../../components/eventForm/EventTimeSection'
import { EventDetailsSection } from '../../components/eventForm/EventDetailsSection'
import { useState } from 'react'
import { useTodoFormViewModel } from './useTodoFormViewModel'
import type { EventFormSnapshot } from '../../hooks/useEventFormDirty'

export function TodoFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const selectedDate = useUiStore(s => s.selectedDate)

  const prefilled = (location.state as { prefilled?: Partial<EventFormSnapshot> } | null)?.prefilled

  const vm = useTodoFormViewModel(id, prefilled, selectedDate)

  // ── 성공 키 → toast + navigate ─────────────────────────────────────

  useEffect(() => {
    if (!vm.successKey) return
    navigate(-1)
    // navigate 후 컴포넌트가 언마운트되므로 dismissMessage 생략 가능하지만
    // 혹시 남아 있는 경우를 위해 cleanup
    vm.dismissMessage()
  }, [vm.successKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!vm.errorKey) return
    // invalid_ 로 시작하는 키는 인라인 표시 (toast 없음)
    // 그 외 에러는 toast 표시; save_detail_failed 포함
    // dismissMessage 는 호출하지 않음 — successKey 가 함께 세팅된 경우 successKey effect 가 먼저 실행되도록 보장
    if (!vm.errorKey.includes('invalid_')) {
      useToastStore.getState().show(t(vm.errorKey), 'error')
    }
  }, [vm.errorKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 다이얼로그 UI 상태 (표현 계층에만 속함) ──────────────────────

  const [showConfirm, setShowConfirm] = useState(false)
  const [showSaveScope, setShowSaveScope] = useState(false)
  const [showDeleteScope, setShowDeleteScope] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // ── canSave ───────────────────────────────────────────────────────

  const canSave =
    !vm.loading &&
    vm.name.trim() !== '' &&
    vm.isDirty &&
    !vm.saving &&
    !showSaveScope &&
    !showDeleteScope &&
    !showConfirm

  // ── 핸들러 ───────────────────────────────────────────────────────

  async function handleSave() {
    if (!vm.name.trim()) return
    if (vm.saveScopeRequired) {
      setShowSaveScope(true)
      return
    }
    await vm.save()
  }

  async function handleSaveWithScope(scope: import('../../components/RepeatingScopeDialog').RepeatScope) {
    setShowSaveScope(false)
    await vm.save(scope)
  }

  async function handleDelete() {
    if (vm.original?.repeating) {
      setShowDeleteScope(true)
    } else {
      setShowConfirm(true)
    }
  }

  async function applyDelete(scope: import('../../components/RepeatingScopeDialog').RepeatScope) {
    await vm.delete(scope)
    setShowDeleteScope(false)
    setShowConfirm(false)
  }

  function handleClose() {
    if (vm.isDirty) {
      setShowCloseConfirm(true)
    } else {
      navigate(-1)
    }
  }

  function handleCopy() {
    const prefilledData: Partial<EventFormSnapshot> = {
      name: vm.name,
      tagId: vm.tagId,
      eventTime: vm.eventTime,
      repeating: vm.repeating,
      notifications: vm.notifications,
      place: vm.place,
      url: vm.url,
      memo: vm.memo,
    }
    navigate('/todos/new', { state: { prefilled: prefilledData } })
  }

  // detail 저장 실패 toast는 errorKey에서 처리
  const inlineError =
    vm.errorKey && (vm.errorKey.includes('invalid_') || vm.errorKey.includes('save_detail_failed'))
      ? null
      : null

  return (
    <div className="min-h-screen bg-surface-sunken">
      <EventFormHeader
        name={vm.name}
        onNameChange={vm.setName}
        onClose={handleClose}
        onSave={handleSave}
        onCopy={handleCopy}
        onDelete={id ? handleDelete : undefined}
        saveDisabled={!canSave}
        isDirty={vm.isDirty}
        idPrefix="todo"
      />

      {/* 페이지 제목: 기존 getByText 테스트 호환을 위해 sr-only 로 유지 */}
      <h1 className="sr-only">{id ? t('todo.edit') : t('todo.new')}</h1>

      {vm.errorKey && vm.errorKey.includes('invalid_') && (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/10 px-6 py-2 text-sm text-destructive"
        >
          {t(vm.errorKey)}
        </div>
      )}
      {inlineError && (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/10 px-6 py-2 text-sm text-destructive"
        >
          {inlineError}
        </div>
      )}

      <div className={`max-w-5xl px-6 py-6 space-y-6 ${vm.loading ? 'pointer-events-none opacity-60' : ''}`}>
        <EventTimeSection
          eventTime={vm.eventTime}
          onEventTimeChange={vm.setEventTime}
          repeating={vm.repeating}
          onRepeatingChange={vm.setRepeating}
          required={false}
        />

        <EventDetailsSection
          place={vm.place}
          onPlaceChange={vm.setPlace}
          url={vm.url}
          onUrlChange={vm.setUrl}
          memo={vm.memo}
          onMemoChange={vm.setMemo}
          tagId={vm.tagId}
          onTagChange={vm.setTagId}
          notifications={vm.notifications}
          onNotificationsChange={vm.setNotifications}
          isAllDay={vm.eventTime?.time_type === 'allday'}
          fieldPrefix="todo"
        />
      </div>

      {showConfirm && (
        <ConfirmDialog
          title={t('todoForm.delete_confirm_title')}
          message={t('todoForm.delete_confirm_message', { name: vm.name })}
          confirmLabel={t('common.delete')}
          onConfirm={async () => { setShowConfirm(false); await applyDelete('this') }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {showSaveScope && (
        <RepeatingScopeDialog
          mode="edit"
          eventType="todo"
          onSelect={handleSaveWithScope}
          onCancel={() => setShowSaveScope(false)}
        />
      )}
      {showDeleteScope && (
        <RepeatingScopeDialog
          mode="delete"
          eventType="todo"
          onSelect={async scope => { setShowDeleteScope(false); await applyDelete(scope) }}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}
      {showCloseConfirm && (
        <ConfirmDialog
          title={t('eventForm.close_confirm_title')}
          message={t('eventForm.close_confirm_message')}
          confirmLabel={t('common.leave')}
          onConfirm={() => { setShowCloseConfirm(false); navigate(-1) }}
          onCancel={() => setShowCloseConfirm(false)}
          danger={false}
        />
      )}
    </div>
  )
}
