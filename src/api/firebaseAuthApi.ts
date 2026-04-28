import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth'
import { getAuthInstance } from '../firebase'
import type { AuthFirebaseApi } from '../repositories/AuthRepository'

// Firebase 인증 동작을 AuthFirebaseApi 인터페이스로 감싼다.
// AuthRepository는 이 인터페이스에만 의존하므로 테스트 시 fake로 대체 가능하다.

export const firebaseAuthApi: AuthFirebaseApi = {
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(getAuthInstance(), provider)
  },

  async signInWithApple(): Promise<void> {
    const provider = new OAuthProvider('apple.com')
    await signInWithPopup(getAuthInstance(), provider)
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(getAuthInstance())
  },
}
