import { configureAxe } from 'vitest-axe';

/**
 * axe for jsdom. `color-contrast` needs a real canvas, which jsdom lacks; contrast is instead
 * guaranteed by the colour tokens documented in tailwind.config.ts and checked in Lighthouse.
 */
export const axe = configureAxe({ rules: { 'color-contrast': { enabled: false } } });
