/**
 * @internal repositories 모듈 내부에서만 사용. 외부 import 금지.
 * Repository 클래스를 통해서만 노출한다.
 */
import { create } from 'zustand'
import type { ForemostEvent } from '../../models'

interface ForemostEventCacheState {
  foremostEvent: ForemostEvent | null
  // ── cache primitive operations (used by ForemostEventRepository) ─
  setEvent: (event: ForemostEvent | null) => void
  reset: () => void
}

export const useForemostEventCache = create<ForemostEventCacheState>((set) => ({
  foremostEvent: null,

  setEvent: (event: ForemostEvent | null) => set({ foremostEvent: event }),

  reset: () => set({ foremostEvent: null }),
}))
