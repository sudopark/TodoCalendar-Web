import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import type { Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)

// getAuth 는 첫 호출 시점까지 초기화를 지연한다.
// 모듈 로딩 단계에서 firebase auth 가 즉시 초기화되면 테스트 환경에서
// auth/invalid-api-key 에러가 연쇄적으로 발생하기 때문이다.
let _auth: Auth | null = null
export function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(app)
    if (import.meta.env.DEV) {
      connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true })
    }
  }
  return _auth
}
