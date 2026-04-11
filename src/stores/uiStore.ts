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

  setSelectedDate: (date: Date) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCurrentMonth: (date: Date) => void
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(),
  sidebarOpen: loadSidebarState(),
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),

  setSelectedDate: (date: Date) => {
    const current = get().selectedDate
    if (current && formatDateKey(current) === formatDateKey(date)) {
      set({ selectedDate: null })
    } else {
      set({ selectedDate: date })
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

  goToPrevMonth: () => {
    set({ currentMonth: navigateMonth(get().currentMonth, -1) })
  },

  goToNextMonth: () => {
    set({ currentMonth: navigateMonth(get().currentMonth, 1) })
  },

  goToToday: () => {
    const today = new Date()
    set({
      currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
      selectedDate: today,
    })
  },
}))
