/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import { foremostApi } from '../../api/foremostApi'
import type { ForemostEvent } from '../../models'

interface ForemostEventCacheState {
  foremostEvent: ForemostEvent | null
  // ── cache primitive operations (used by ForemostEventRepository) ─
  setEvent: (event: ForemostEvent | null) => void
  reset: () => void
  // ── legacy business operations (callers still using useForemostEventStore) ──
  fetch: () => Promise<void>
  setForemost: (eventId: string, isTodo: boolean) => Promise<void>
  removeForemost: () => Promise<void>
}

export const useForemostEventCache = create<ForemostEventCacheState>((set) => ({
  foremostEvent: null,

  // ── cache primitive operations ────────────────────────────────────

  setEvent: (event: ForemostEvent | null) => set({ foremostEvent: event }),

  reset: () => set({ foremostEvent: null }),

  // ── legacy business operations ────────────────────────────────────

  fetch: async () => {
    try {
      const event = await foremostApi.getForemostEvent()
      set({ foremostEvent: event })
    } catch (e) {
      console.warn('Foremost event 로드 실패:', e)
      set({ foremostEvent: null })
      throw e
    }
  },

  setForemost: async (eventId: string, isTodo: boolean) => {
    try {
      const event = await foremostApi.setForemostEvent({ event_id: eventId, is_todo: isTodo })
      set({ foremostEvent: event })
    } catch (e) {
      console.warn('Foremost 설정 실패:', e)
    }
  },

  removeForemost: async () => {
    try {
      await foremostApi.removeForemostEvent()
      set({ foremostEvent: null })
    } catch (e) {
      console.warn('Foremost 해제 실패:', e)
    }
  },
}))
