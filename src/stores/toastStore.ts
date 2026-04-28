import { create } from 'zustand'

export interface ToastItem {
  id: string
  key: string
  params?: Record<string, unknown>
  type: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: ToastItem[]
  show: (key: string, type?: ToastItem['type'], params?: Record<string, unknown>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (key, type = 'info', params) => {
    const id = crypto.randomUUID()
    set({ toasts: [...get().toasts, { id, key, params, type }] })
    setTimeout(() => get().dismiss(id), 3000)
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  },
}))
