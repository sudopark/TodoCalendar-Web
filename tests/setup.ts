import '@testing-library/jest-dom'
import { vi } from 'vitest'
// IndexedDB polyfill — Vitest 의 jsdom/happy-dom 환경엔 IDB 가 없음
import 'fake-indexeddb/auto'

// Firebase auth: 테스트 환경엔 API key 가 없으므로 getAuth 가 throw.
// 모듈 init 시점에 호출되는 src/firebase.ts 의 의존성을 글로벌 모킹.
// 개별 테스트에서 더 정밀한 모킹이 필요하면 vi.mock 으로 override.
vi.mock('../src/firebase', () => ({
  getAuthInstance: vi.fn(() => ({})),
}))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
  OAuthProvider: vi.fn().mockImplementation(function (this: unknown) { return this }),
}))

import '../src/i18n'

// @base-ui/react Checkbox가 jsdom에 없는 PointerEvent를 참조하는 문제 방지
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventMock extends MouseEvent {
    pointerId: number
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
    }
  }
  globalThis.PointerEvent = PointerEventMock as unknown as typeof PointerEvent
}

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// @base-ui/react ScrollArea가 jsdom에 없는 Web Animations API를 호출하는 문제 방지
if (typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => []
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
