/** @type {import('tailwindcss').Config} */
const v = (n) => `var(--${n})`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: v('bg-base'), raised: v('bg-raised'), panel: v('bg-panel'), hover: v('bg-hover'),
        line: { subtle: v('border-subtle'), DEFAULT: v('border-default'), strong: v('border-strong') },
        ink: { DEFAULT: v('text-primary'), 2: v('text-secondary'), 3: v('text-tertiary') },
        critical: v('signal-critical'), warning: v('signal-warning'), ok: v('signal-ok'),
        info: v('signal-info'), planned: v('signal-planned'),
        accent: { DEFAULT: v('accent'), dim: v('accent-dim') },
        oil: v('stream-oil'), gas: v('stream-gas'), water: v('stream-water'), liquid: v('stream-liquid'),
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        micro: ['11px', '14px'], dense: ['12px', '16px'], body: ['13px', '18px'],
        section: ['15px', '20px'], title: ['20px', '26px'], kpi: ['28px', '32px'], hero: ['40px', '44px'],
      },
      borderRadius: { sm: v('radius-sm'), md: v('radius-md'), lg: v('radius-lg') },
    },
  },
  plugins: [],
};
