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
  // #109: Firebase 인증은 성공했지만 백엔드 `/v1/accounts/info` 등록이 실패해서
  // account 가 null 로 남는 경우, 로그인 화면이 stuck 되지 않도록 viewmodel 이 관측할 수 있는 신호.
  // null = 정상 / 'account_register_failed' = 직전 시도가 백엔드 실패.
  signInError: string | null
  setAccount: (account: Account | null) => void
  clearSignInError: () => void
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
        set({ account, loading: false, signInError: null })
        initialAuthDone = true
      } catch (e) {
        console.warn('계정 등록 실패:', e)
        // #109: account 는 null 그대로 두되, viewmodel 이 관측할 수 있는 fail 신호를 set 한다.
        set({ account: null, loading: false, signInError: 'account_register_failed' })
      }
    } else {
      set({ account: null, loading: false })
    }
  })

  return {
    account: null,
    loading: true,
    signInError: null,
    setAccount: (account) => set({ account }),
    clearSignInError: () => set({ signInError: null }),
    reset: () => {
      set({ account: null, loading: false, signInError: null })
      initialAuthDone = false
    },
  }
})
