import { useAuthStore } from '../stores/authStore'

// ── Firebase 인증 동작 인터페이스 ────────────────────────────────────
// Firebase 모듈에 직접 의존하지 않도록 인터페이스로 추상화한다.
// 테스트 시 이 인터페이스를 구현한 fake로 대체한다.

export interface AuthFirebaseApi {
  signInWithGoogle(): Promise<void>
  signInWithApple(): Promise<void>
  signOut(): Promise<void>
}

interface Deps {
  api: AuthFirebaseApi
}

export class AuthRepository {
  private readonly deps: Deps

  constructor(deps: Deps) {
    this.deps = deps
  }

  // ── 로그인 ────────────────────────────────────────────────────────
  // Firebase popup 인증을 호출한다. 성공하면 onAuthStateChanged 콜백이
  // 실행되어 authStore.account 가 갱신된다 (authStore 내부 처리).

  async signInWithGoogle(): Promise<void> {
    await this.deps.api.signInWithGoogle()
  }

  async signInWithApple(): Promise<void> {
    await this.deps.api.signInWithApple()
  }

  // ── 로그아웃 ──────────────────────────────────────────────────────
  // Firebase signOut 후 authStore와 모든 데이터 캐시를 초기화한다.
  // Firebase 서버 호출 실패 시에도 로컬 정리는 반드시 진행한다.

  async signOut(): Promise<void> {
    try {
      await this.deps.api.signOut()
    } catch {
      // 서버 호출 실패해도 로컬 정리는 진행한다
    }
    // authStore 인증 상태 초기화
    useAuthStore.getState().reset()
    // 데이터 캐시 초기화 — 기존 authStore.signOut의 cascading reset과 동일
    const { useEventTagListCache } = await import('./caches/eventTagListCache')
    const { useCurrentTodosCache } = await import('./caches/currentTodosCache')
    const { useForemostEventCache } = await import('./caches/foremostEventCache')
    const { useCalendarEventsCache } = await import('./caches/calendarEventsCache')
    const { useUncompletedTodosCache } = await import('./caches/uncompletedTodosCache')
    useEventTagListCache.getState().reset()
    useCurrentTodosCache.getState().reset()
    useForemostEventCache.getState().reset()
    useCalendarEventsCache.getState().reset()
    useUncompletedTodosCache.getState().reset()
    const { useDoneTodosCache } = await import('./caches/doneTodosCache')
    const { useSettingsCache } = await import('./caches/settingsCache')
    useDoneTodosCache.getState().reset()
    useSettingsCache.getState().reset()
  }
}
