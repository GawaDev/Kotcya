import '@testing-library/jest-dom/vitest'

class ResizeObserverStub implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: ResizeObserverStub,
})

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value: () => undefined,
})
