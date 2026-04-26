import { create } from 'zustand'

const STORAGE_KEY = 'event_defaults'

interface EventDefaults {
  defaultTagId: string | null
  defaultNotificationSeconds: number | null
  defaultAllDayNotificationSeconds: number | null
}

const DEFAULT_VALUES: EventDefaults = {
  defaultTagId: null,
  defaultNotificationSeconds: null,
  defaultAllDayNotificationSeconds: null,
}

function load(): EventDefaults {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...DEFAULT_VALUES, ...JSON.parse(stored) } : DEFAULT_VALUES
  } catch { return DEFAULT_VALUES }
}

interface EventDefaultsState extends EventDefaults {
  setDefaults: (updates: Partial<EventDefaults>) => void
}

export const useEventDefaultsStore = create<EventDefaultsState>((set, get) => ({
  ...load(),
  setDefaults: (updates) => {
    const next = { ...get(), ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      defaultTagId: next.defaultTagId,
      defaultNotificationSeconds: next.defaultNotificationSeconds,
      defaultAllDayNotificationSeconds: next.defaultAllDayNotificationSeconds,
    }))
    set(updates)
  },
}))
