import { create } from 'zustand'
import { formatDateKey } from '../domain/functions/eventTime'
import { navigateMonth } from '../calendar/calendarUtils'

const SIDEBAR_STORAGE_KEY = 'sidebar_open'

function loadSidebarState(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

export type RightPanelMode = 'dayEvents' | 'archive'

interface UiState {
  selectedDate: Date | null
  sidebarOpen: boolean
  currentMonth: Date
  sidebarMonth: Date
  rightPanelOpen: boolean
  rightPanelMode: RightPanelMode

  setSelectedDate: (date: Date) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCurrentMonth: (date: Date) => void
  setSidebarMonth: (date: Date) => void
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void
  openArchivePanel: () => void
  exitArchivePanel: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
  sidebarOpen: loadSidebarState(),
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  sidebarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  rightPanelOpen: true,
  rightPanelMode: 'dayEvents',

  setSelectedDate: (date: Date) => {
    const current = get().selectedDate
    const panelOpen = get().rightPanelOpen
    const mode = get().rightPanelMode
    const isSame = current && formatDateKey(current) === formatDateKey(date)
    // 아카이브 모드에서 날짜 클릭 시: 해당 날짜 이벤트 모드로 복귀 + 선택
    if (mode === 'archive') {
      set({
        selectedDate: date,
        currentMonth: new Date(date.getFullYear(), date.getMonth(), 1),
        rightPanelOpen: true,
        rightPanelMode: 'dayEvents',
      })
      return
    }
    if (isSame && panelOpen) {
      set({ selectedDate: null, rightPanelOpen: false })
    } else {
      set({
        selectedDate: date,
        currentMonth: new Date(date.getFullYear(), date.getMonth(), 1),
        rightPanelOpen: true,
      })
    }
  },

  toggleSidebar: () => {
    const next = !get().sidebarOpen
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    set({ sidebarOpen: next })
  },

  setSidebarOpen: (open: boolean) => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open))
    set({ sidebarOpen: open })
  },

  setCurrentMonth: (date: Date) => {
    set({ currentMonth: new Date(date.getFullYear(), date.getMonth(), 1) })
  },

  setSidebarMonth: (date: Date) => {
    set({ sidebarMonth: new Date(date.getFullYear(), date.getMonth(), 1) })
  },

  goToPrevMonth: () => {
    set({ currentMonth: navigateMonth(get().currentMonth, -1) })
  },

  goToNextMonth: () => {
    set({ currentMonth: navigateMonth(get().currentMonth, 1) })
  },

  goToToday: () => {
    const today = new Date()
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    set({
      currentMonth: todayMonth,
      sidebarMonth: todayMonth,
      selectedDate: today,
    })
  },

  toggleRightPanel: () => {
    set({ rightPanelOpen: !get().rightPanelOpen })
  },

  setRightPanelOpen: (open: boolean) => {
    set({ rightPanelOpen: open })
  },

  // 아카이브(완료된 할 일) 패널 열기 — 우측 패널 모드 전환
  openArchivePanel: () => {
    set({ rightPanelOpen: true, rightPanelMode: 'archive' })
  },

  // 아카이브 모드에서 나와 "오늘 이벤트" 모드로 복귀 (패널은 열린 상태 유지)
  exitArchivePanel: () => {
    set({ rightPanelMode: 'dayEvents' })
  },
}))
