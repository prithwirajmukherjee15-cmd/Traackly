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
        accent: { DEFAULT: v('accent'), hover: v('accent-hover'), soft: v('accent-soft') },
        panel: { warm: v('panel-warm'), cool: v('panel-cool') },
        black: v('ink-black'),
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
        prio: { urgent: v('prio-urgent'), normal: v('prio-normal') },
        dept: { production: v('dept-production'), supply: v('dept-supply'), qa: v('dept-qa') },
        kiosk: { bg: v('kiosk-bg'), card: v('kiosk-card'), line: v('kiosk-line'), ink: v('kiosk-ink'), muted: v('kiosk-muted') },
      },
      boxShadow: {
        panel: '0 4px 20px rgb(var(--shadow) / 0.08)',
        pop: '0 8px 32px rgb(var(--shadow) / 0.18)',
      },
      borderRadius: { panel: '16px', section: '24px' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'draw-line': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'row-in': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        'drawer-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'menu-in': { from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'bar-up': { from: { opacity: '0', transform: 'translate(-50%, 16px)' }, to: { opacity: '1', transform: 'translate(-50%, 0)' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pop-in': 'pop-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'row-in': 'row-in 0.5s cubic-bezier(0.645, 0.045, 0.355, 1) both',
        'drawer-in': 'drawer-in 0.35s cubic-bezier(0.645, 0.045, 0.355, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'menu-in': 'menu-in 0.15s ease-out both',
        'bar-up': 'bar-up 0.3s cubic-bezier(0.645, 0.045, 0.355, 1) both',
      },
      transitionTimingFunction: {
        // Measured from the reference site's hover and reveal transitions.
        'out-soft': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        'pill': 'cubic-bezier(0.515, 0.147, 0.25, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [],
} satisfies Config;
