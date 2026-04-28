import { create } from 'zustand'
import {
  onAuthStateChanged,
} from 'firebase/auth'
import { getAuthInstance } from '../firebase'
import { apiClient } from '../api/apiClient'

export interface Account {
  uid: string
  email?: string | null
  method?: string | null
  first_signed_in?: string | null
  last_sign_in?: string | null
}

interface AuthState {
  account: Account | null
  loading: boolean
  setAccount: (account: Account | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set, get) => {
  let initialAuthDone = false
  onAuthStateChanged(getAuthInstance(), async (firebaseUser) => {
    if (firebaseUser) {
      // 초기 인증 이후 동일 uid의 token refresh는 skip
      if (initialAuthDone && get().account?.uid === firebaseUser.uid) {
        set({ loading: false })
        return
      }
      try {
        const account = await apiClient.put<Account>('/v1/accounts/info', {})
        set({ account, loading: false })
        initialAuthDone = true
      } catch (e) {
        console.warn('계정 등록 실패:', e)
        set({ account: null, loading: false })
      }
    } else {
      set({ account: null, loading: false })
    }
  })

  return {
    account: null,
    loading: true,
    setAccount: (account) => set({ account }),
    reset: () => {
      set({ account: null, loading: false })
      initialAuthDone = false
    },
  }
})
