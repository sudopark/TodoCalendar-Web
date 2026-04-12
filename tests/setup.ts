import '@testing-library/jest-dom'
import '../src/i18n'

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
