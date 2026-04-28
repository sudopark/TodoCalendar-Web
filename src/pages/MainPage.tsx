import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopToolbar from '../components/TopToolbar'
import LeftSidebar from '../components/LeftSidebar'
import MainCalendar from '../calendar/MainCalendar'
import { RightEventPanel } from '../components/RightEventPanel'
import { EventFormPopover } from '../components/eventForm/EventFormPopover'
import { EventDetailPopover } from '../components/EventDetail/EventDetailPopover'
import { RepeatingScopeDialog } from '../components/RepeatingScopeDialog'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useUiStore } from '../stores/uiStore'
import { useToastStore } from '../stores/toastStore'
import { deleteTodoEvent, deleteScheduleEvent } from '../utils/eventDeleteHelper'
import type { CalendarEvent } from '../domain/functions/eventTime'
import type { RepeatScope } from '../components/RepeatingScopeDialog'

interface PopoverState {
  calEvent: CalendarEvent
  anchorRect: DOMRect
}

export function MainPage() {
  const { t } = useTranslation()
  useKeyboardShortcuts()
  const navigate = useNavigate()
  const location = useLocation()
  const rightPanelOpen = useUiStore(s => s.rightPanelOpen)

  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [showDeleteScope, setShowDeleteScope] = useState(false)

  function handleEventClick(calEvent: CalendarEvent, anchorRect: DOMRect) {
    setPopover({ calEvent, anchorRect })
  }

  function handleClosePopover() {
    setPopover(null)
  }

  function handleEdit() {
    if (!popover) return
    const { calEvent } = popover
    const path = calEvent.type === 'todo'
      ? `/todos/${calEvent.event.uuid}/edit`
      : `/schedules/${calEvent.event.uuid}/edit`
    navigate(path, { state: { background: location } })
    setPopover(null)
  }

  function handleDeleteClick() {
    if (!popover) return
    if (popover.calEvent.event.repeating) {
      setShowDeleteScope(true)
    } else {
      applyDelete()
    }
  }

  async function applyDelete(scope?: RepeatScope) {
    if (!popover) return
    setShowDeleteScope(false)
    try {
      if (popover.calEvent.type === 'todo') {
        await deleteTodoEvent(popover.calEvent.event, scope)
      } else {
        await deleteScheduleEvent(popover.calEvent.event, scope)
      }
      setPopover(null)
    } catch {
      useToastStore.getState().show(t('event.delete_failed', '삭제 실패'), 'error')
    }
  }

  return (
    <div className="h-screen bg-slate-50">
      <div className="flex h-full flex-col overflow-hidden">
        <TopToolbar />
        <div className="flex flex-1 min-h-0">
          <LeftSidebar />
          <MainCalendar onEventClick={handleEventClick} />

          {/* 인라인 패널: 열리면 중앙 캘린더가 줄어듦 */}
          <div
            className={`shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
              rightPanelOpen ? 'w-[408px]' : 'w-0'
            }`}
          >
            <div className="w-[408px] h-full py-4 pr-4">
              <div className="h-full rounded-lg border border-border-calendar bg-white shadow-sm overflow-hidden">
                <RightEventPanel onEventClick={handleEventClick} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <EventFormPopover />

      {popover && (
        <EventDetailPopover
          calEvent={popover.calEvent}
          anchorRect={popover.anchorRect}
          onClose={handleClosePopover}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      {showDeleteScope && popover && (
        <RepeatingScopeDialog
          mode="delete"
          eventType={popover.calEvent.type}
          onSelect={(scope) => applyDelete(scope)}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}
    </div>
  )
}
