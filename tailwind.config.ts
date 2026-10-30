import type { Config } from 'tailwindcss';

// Colour tokens are CSS variables defined in src/styles/index.css for light, dark and live themes.
// Contrast (checked against `bg`): fg ≥ 12:1, muted ≥ 4.5:1, accent/ok/warn/danger ≥ 4.5:1,
// line & focus ≥ 3:1 (WCAG 1.4.11 non-text contrast).
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        fg: token('fg'),
        muted: token('muted'),
        line: token('line'),
        accent: token('accent'),
        'accent-fg': token('accent-fg'),
        focus: token('focus'),
        ok: token('ok'),
        warn: token('warn'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
