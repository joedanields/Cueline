import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { afterEach, expect } from 'vitest';

expect.extend(axeMatchers);

// No real network in tests: any fetch that a test has not explicitly mocked fails loudly.
const unmockedFetch = (input: unknown): Promise<Response> => {
  throw new Error(`Unmocked fetch in test: ${String(input)}`);
};
globalThis.fetch = unmockedFetch as typeof fetch;

if (typeof document !== 'undefined') {
  const { cleanup, configure } = await import('@testing-library/react');
  // Lazy routes compile on first import in jsdom, which can exceed the 1 s default.
  configure({ asyncUtilTimeout: 10_000 });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });
}
