import { create } from 'zustand'
import { formatDateKey } from '../utils/eventTimeUtils'
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

interface UiState {
  selectedDate: Date | null
  sidebarOpen: boolean
  currentMonth: Date
  sidebarMonth: Date
  rightPanelOpen: boolean

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
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
  sidebarOpen: loadSidebarState(),
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  sidebarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  rightPanelOpen: true,

  setSelectedDate: (date: Date) => {
    const current = get().selectedDate
    if (current && formatDateKey(current) === formatDateKey(date)) {
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
}))
