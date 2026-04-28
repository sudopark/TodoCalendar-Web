import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TopToolbar from '../../components/TopToolbar'
import LeftSidebar from '../../components/LeftSidebar'
import MainCalendar from '../../calendar/MainCalendar'
import { RightEventPanel } from '../../components/RightEventPanel'
import { EventFormPopover } from '../../components/eventForm/EventFormPopover'
import { EventDetailPopover } from '../../components/EventDetail/EventDetailPopover'
import { RepeatingScopeDialog } from '../../components/RepeatingScopeDialog'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useMainViewModel } from './useMainViewModel'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { EventDeletionService } from '../../domain/services/EventDeletionService'
import { useToastStore } from '../../stores/toastStore'
import type { CalendarEvent } from '../../domain/functions/eventTime'
import type { RepeatScope } from '../../components/RepeatingScopeDialog'

interface PopoverState {
  calEvent: CalendarEvent
  anchorRect: DOMRect
}

export function MainPage() {
  useKeyboardShortcuts()
  const navigate = useNavigate()
  const location = useLocation()
  const vm = useMainViewModel()
  const { eventRepo } = useRepositories()
  const deletionService = useMemo(() => new EventDeletionService({ eventRepo }), [eventRepo])

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
        await deletionService.deleteTodo(popover.calEvent.event, scope)
      } else {
        await deletionService.deleteSchedule(popover.calEvent.event, scope)
      }
      setPopover(null)
    } catch {
      useToastStore.getState().show('event.delete_failed', 'error')
    }
  }

  return (
    <div className="h-screen bg-slate-50">
      <div className="flex h-full flex-col overflow-hidden">
        <TopToolbar
          currentMonth={vm.currentMonth}
          sidebarOpen={vm.sidebarOpen}
          loading={vm.loading}
          onToggleSidebar={vm.toggleSidebar}
          onGoToToday={vm.goToToday}
          onGoToPrevMonth={vm.goToPrevMonth}
          onGoToNextMonth={vm.goToNextMonth}
          onRefresh={vm.refresh}
        />
        <div className="flex flex-1 min-h-0">
          <LeftSidebar
            sidebarOpen={vm.sidebarOpen}
            sidebarMonth={vm.sidebarMonth}
            selectedDate={vm.selectedDate}
            getHolidayNames={vm.getHolidayNames}
            onSetSelectedDate={vm.setSelectedDate}
            onSetSidebarMonth={vm.setSidebarMonth}
            onOpenEventForm={vm.openEventForm}
          />
          <MainCalendar
            currentMonth={vm.currentMonth}
            weekStartDay={vm.weekStartDay}
            eventDisplayLevel={vm.eventDisplayLevel}
            onEventClick={handleEventClick}
          />

          {/* 인라인 패널: 열리면 중앙 캘린더가 줄어듦 */}
          <div
            className={`shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out ${
              vm.rightPanelOpen ? 'w-[408px]' : 'w-0'
            }`}
          >
            <div className="w-[408px] h-full py-4 pr-4">
              <div className="h-full rounded-lg border border-border-calendar bg-white shadow-sm overflow-hidden">
                <RightEventPanel
                  selectedDate={vm.selectedDate}
                  rightPanelMode={vm.rightPanelMode}
                  foremostEvent={vm.foremostEvent}
                  currentTodos={vm.currentTodos}
                  uncompletedTodos={vm.uncompletedTodos}
                  showUncompletedTodos={vm.showUncompletedTodos}
                  showHolidayInEventList={vm.showHolidayInEventList}
                  showLunarCalendar={vm.showLunarCalendar}
                  eventsByDate={vm.eventsByDate}
                  isTagHidden={vm.isTagHidden}
                  getHolidayNames={vm.getHolidayNames}
                  onReloadUncompletedTodos={vm.reloadUncompletedTodos}
                  onToggleRightPanel={vm.toggleRightPanel}
                  onOpenArchivePanel={vm.openArchivePanel}
                  onEventClick={handleEventClick}
                />
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
