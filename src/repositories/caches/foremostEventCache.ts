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

// 동시 fetch 호출 (AuthGuard + 페이지 ViewModel + dev StrictMode 이중 effect 등) 시
// 같은 promise 를 공유해 API 호출 1회로 묶는다 (#99).
let inFlight: Promise<void> | null = null

export const useForemostEventCache = create<ForemostEventCacheState>((set) => ({
  foremostEvent: null,

  // ── cache primitive operations ────────────────────────────────────

  setEvent: (event: ForemostEvent | null) => set({ foremostEvent: event }),

  reset: () => set({ foremostEvent: null }),

  // ── legacy business operations ────────────────────────────────────

  fetch: async () => {
    if (inFlight) return inFlight
    inFlight = (async () => {
      try {
        const event = await foremostApi.getForemostEvent()
        set({ foremostEvent: event })
      } catch (e) {
        console.warn('Foremost event 로드 실패:', e)
        set({ foremostEvent: null })
        throw e
      } finally {
        inFlight = null
      }
    })()
    return inFlight
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
