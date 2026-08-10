import { afterAll, afterEach, beforeAll, vi } from 'vitest'

// Mock lottie-web at the VERY TOP before any other code
vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: () => ({
      destroy: () => {},
      play: () => {},
      stop: () => {},
      setSpeed: () => {},
      goToAndPlay: () => {},
      goToAndStop: () => {},
    }),
  },
}))

// Polyfill HTMLCanvasElement BEFORE any imports to prevent lottie-web canvas errors
if (typeof window !== 'undefined') {
  const originalCanvas = window.HTMLCanvasElement
  if (!originalCanvas || originalCanvas.name !== 'HTMLCanvasElement') {
    window.HTMLCanvasElement = class {
      constructor() {
        this.width = 0
        this.height = 0
      }
      getContext() {
        return {
          fillStyle: null,
          strokeStyle: null,
          lineWidth: 1,
          fillRect: () => {},
          strokeRect: () => {},
          clearRect: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          arc: () => {},
          save: () => {},
          restore: () => {},
          drawImage: () => {},
          scale: () => {},
          translate: () => {},
          rotate: () => {},
          transform: () => {},
          setTransform: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
        }
      }
      toDataURL() {
        return ''
      }
    }
  }
}

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// Global useBusiness hook mock
vi.mock('@/hooks/useBusiness', () => ({
  useBusiness: vi.fn(() => ({
    business: {
      id: 'test-business-123',
      businessName: 'Test Business',
      applicationStatus: 'approved',
      permitNumber: 'PERMIT-001',
      totalPayments: 0,
      inspectionsCompleted: 0,
      pendingInspections: 1,
      unreadNotifications: 3,
      unlockedFeatures: [],
      hasSeenOnboarding: false
    },
    businesses: [
      {
        id: 'test-business-123',
        businessName: 'Test Business',
        applicationStatus: 'approved',
        permitNumber: 'PERMIT-001'
      }
    ],
    loading: false,
    error: null,
    updateBusiness: vi.fn(),
    createBusiness: vi.fn(),
    deleteBusiness: vi.fn(),
    setCurrentBusiness: vi.fn()
  }))
}));

// Mock performance hooks directly to fix scope issues
vi.mock('@/features/business-owner/utils/performanceHooks.jsx', () => ({
  useDebounce: vi.fn((func, delay) => {
    const timeoutRef = { current: null };
    const debouncedFunc = (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
    return debouncedFunc;
  }),
  useThrottle: vi.fn((func, delay) => {
    let lastCall = 0;
    let timeoutId = null;
    const throttledFunc = (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func(...args);
          timeoutId = null;
        }, delay - (now - lastCall));
      }
    };
    return throttledFunc;
  }),
  useMemoizedSearch: vi.fn((data, fields, searchTerm) => {
  // Create a simple cache to memoize results
  const cache = new Map();
  const key = JSON.stringify({ dataLength: data.length, fields, searchTerm });
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  let result;
  if (!searchTerm) {
    result = data;
  } else {
    result = data.filter(item => 
      fields.some(field => 
        item[field].toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }
  
  cache.set(key, result);
  return result;
}),
  usePagination: vi.fn((data, pageSize = 10) => {
  // Create a closure to maintain state
  let currentPage = 1;
  const totalPages = Math.ceil(data.length / pageSize);
  
  const setCurrentPage = (newPage) => {
    currentPage = typeof newPage === 'function' ? newPage(currentPage) : newPage;
  };

  /* eslint-disable no-use-before-define */
  const updateState = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);
    
    // Update the returned object in place
    Object.assign(state, {
      currentPage,
      totalPages,
      paginatedData,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    });
  };
  /* eslint-enable no-use-before-define */
  
  const state = {
    currentPage: 1,
    totalPages,
    paginatedData: data.slice(0, pageSize),
    hasNextPage: true,
    hasPrevPage: false,
    nextPage: () => {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
      updateState();
    },
    prevPage: () => {
      setCurrentPage(prev => Math.max(prev - 1, 1));
      updateState();
    },
    goToPage: (page) => {
      setCurrentPage(page);
    }
  };
  
  return state;
}),
  usePerformanceMonitor: vi.fn((_componentName) => {
    const renderCount = { current: 0 };
    const renderTimes = [];
    let startTime = Date.now();
    
    // Simulate render tracking
    renderCount.current += 1;
    const endTime = Date.now();
    renderTimes.push(endTime - startTime);
    startTime = Date.now();
    
    const getMetrics = () => ({
      renderCount: renderCount.current,
      averageRenderTime: renderTimes.length > 0 
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
        : 0,
      lastRenderTime: renderTimes[renderTimes.length - 1] || 0
    });
    
    return { getMetrics };
  })
}));

// Ensure localStorage is usable (vitest --localstorage-file can leave it broken in jsdom)
if (typeof window !== 'undefined') {
  const createStorage = () => {
    const store = {}
    return {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
      clear: () => { for (const k of Object.keys(store)) delete store[k] },
      get length() { return Object.keys(store).length },
      key: (i) => Object.keys(store)[i] ?? null,
    }
  }
  const orig = window.localStorage
  if (!orig || typeof orig.getItem !== 'function') {
    try {
      Object.defineProperty(window, 'localStorage', { value: createStorage(), writable: true, configurable: true })
    } catch {
      window.localStorage = createStorage()
    }
  }
  const origSession = window.sessionStorage
  if (!origSession || typeof origSession.getItem !== 'function') {
    try {
      Object.defineProperty(window, 'sessionStorage', { value: createStorage(), writable: true, configurable: true })
    } catch {
      window.sessionStorage = createStorage()
    }
  }
}

// Configure React 18/19 act() support for non-Jest environments (Vitest + jsdom)
// This silences the warning: "The current testing environment is not configured to support act(...)"
// See: https://react.dev/reference/react-dom/test-utils/act
// and https://github.com/facebook/react/issues/27106
globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
})

vi.mock('@/features/authentication/components/PasskeySignInOptions.jsx', () => ({
  default: () => null,
}))

// Mock LottieSpinner to prevent canvas errors in headless test environment
vi.mock('@/shared/components/LottieSpinner.jsx', () => ({
  default: () => null,
}))

// Polyfill ResizeObserver for Ant Design components
if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
      this.observations = new Map()
    }
    observe(target, options) {
      if (!this.observations.has(target)) {
        this.observations.set(target, new Map())
      }
      this.observations.get(target).set(options, true)
    }
    unobserve(target) {
      this.observations.delete(target)
    }
    disconnect() {
      this.observations.clear()
    }
  }
}

// Polyfill scrollTo to avoid errors in JSDOM (used by some AntD components)
if (typeof window !== 'undefined' && typeof window.scrollTo !== 'function') {
  window.scrollTo = vi.fn()
}

// Polyfill requestAnimationFrame/cancelAnimationFrame for React 19 and rc-motion
if (typeof window !== 'undefined' && typeof window.requestAnimationFrame !== 'function') {
  window.requestAnimationFrame = (callback) => setTimeout(callback, 0)
}
if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame !== 'function') {
  window.cancelAnimationFrame = (id) => clearTimeout(id)
}

// Polyfill window.matchMedia used by Ant Design's responsive observers
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// Provide a simple clipboard mock for copy tests
if (typeof navigator !== 'undefined' && !navigator.clipboard) {
  navigator.clipboard = {
    writeText: async (text) => {
      // store last copied text for tests to inspect if needed
      navigator.__lastCopied = String(text)
      return Promise.resolve()
    }
  }
}

/**
 * Shared MSW server for deterministic API mocks in node/Vitest environments.
 * Skip when running browser-based Storybook/Vitest projects to avoid bundling
 * msw/node in the browser.
 * Note: MSW setup is optional - tests will run without it if MSW is not installed.
 */
// eslint-disable-next-line no-undef
const isNodeRuntime = typeof process !== 'undefined' && !!process.versions?.node
if (isNodeRuntime) {
  // Use dynamic import with a string variable to prevent Vite from statically analyzing it
  const mswPath = 'msw/node'
  const setupMSW = async () => {
    try {
      // Dynamic import that Vite won't try to resolve at build time
      const mswModule = await import(/* @vite-ignore */ mswPath)
      const { setupServer } = mswModule
      const { handlers } = await import('./test/msw/handlers.js')
      return setupServer(...handlers)
    } catch {
      // MSW not available, return null
      // Silently skip - tests that don't require MSW will still run
      return null
    }
  }
  
  setupMSW().then((srv) => {
    if (srv) {
      beforeAll(() => srv.listen({ onUnhandledRequest: 'error' }))
      afterEach(() => srv.resetHandlers())
      afterAll(() => srv.close())
    }
  }).catch(() => {
    // Ignore setup errors
  })
}