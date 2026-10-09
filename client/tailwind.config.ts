import type { Config } from 'tailwindcss';

// Every color resolves to a CSS variable defined in src/index.css, so components never hard-code hex values.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Figtree', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: { DEFAULT: v('brand'), hover: v('brand-hover'), soft: v('brand-soft') },
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), faint: v('ink-faint'), inverse: v('ink-inverse') },
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), sunken: v('surface-sunken'), hover: v('surface-hover') },
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warn: { DEFAULT: v('warn'), soft: v('warn-soft'), ink: v('warn-ink') },
        state: {
          raised: v('state-raised'),
          authorization: v('state-authorization'),
          progress: v('state-progress'),
          updated: v('state-updated'),
          completed: v('state-completed'),
          declined: v('state-declined'),
          'raised-ink': v('state-raised-ink'),
          'progress-ink': v('state-progress-ink'),
        },
        kiosk: { bg: v('kiosk-bg'), card: v('kiosk-card'), line: v('kiosk-line'), ink: v('kiosk-ink'), muted: v('kiosk-muted') },
      },
      boxShadow: {
        panel: '0 4px 20px rgb(var(--shadow) / 0.08)',
        pop: '0 8px 32px rgb(var(--shadow) / 0.18)',
      },
      borderRadius: { panel: '16px' },
    },
  },
  plugins: [],
} satisfies Config;
