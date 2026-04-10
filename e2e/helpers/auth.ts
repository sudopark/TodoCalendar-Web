import type { BrowserContext } from '@playwright/test'

const AUTH_EMULATOR_URL = 'http://localhost:9099'
const FIREBASE_API_KEY = 'fake-api-key-for-emulator'

interface SignUpResponse {
  localId: string
  email: string
  idToken: string
  refreshToken: string
}

export async function createTestUser(email: string, password: string): Promise<SignUpResponse> {
  const res = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to create test user: ${error}`)
  }
  return res.json()
}

export async function signInTestUser(email: string, password: string): Promise<SignUpResponse> {
  const res = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Failed to sign in test user: ${error}`)
  }
  return res.json()
}

/**
 * BrowserContext에 Firebase Auth 인증 상태를 주입한다.
 * addInitScript로 페이지 로드 전에 indexedDB에 auth 상태를 기록하여
 * Firebase Auth SDK가 자동으로 인증된 유저를 인식하게 한다.
 */
export async function setupAuthContext(context: BrowserContext): Promise<void> {
  const userInfo = await signInTestUser(TEST_USER.email, TEST_USER.password)

  await context.addInitScript(({ ui, apiKey }) => {
    const req = indexedDB.open('firebaseLocalStorageDb', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
        db.createObjectStore('firebaseLocalStorage')
      }
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('firebaseLocalStorage', 'readwrite')
      const store = tx.objectStore('firebaseLocalStorage')

      const authUser = {
        uid: ui.localId,
        email: ui.email,
        emailVerified: false,
        isAnonymous: false,
        providerData: [],
        stsTokenManager: {
          refreshToken: ui.refreshToken,
          accessToken: ui.idToken,
          expirationTime: Date.now() + 3600 * 1000,
        },
        createdAt: String(Date.now()),
        lastLoginAt: String(Date.now()),
        apiKey,
        appName: '[DEFAULT]',
      }

      const key = `firebase:authUser:${apiKey}:[DEFAULT]`
      store.put({ fbase_key: key, value: authUser }, key)
      tx.oncomplete = () => db.close()
    }
  }, { ui: userInfo, apiKey: FIREBASE_API_KEY })
}

export const TEST_USER = {
  email: 'qa-test@example.com',
  password: 'testpassword123',
}
