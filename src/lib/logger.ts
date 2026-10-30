/* eslint-disable no-console -- the logger is the single sanctioned console wrapper. */
const enabled = import.meta.env.DEV && import.meta.env.MODE !== 'test';

/** Development-only logger. Silent in production and tests so nothing leaks to the console. */
export const logger = {
  warn: (...args: unknown[]): void => {
    if (enabled) console.warn('[cueline]', ...args);
  },
  error: (...args: unknown[]): void => {
    if (enabled) console.error('[cueline]', ...args);
  },
};
