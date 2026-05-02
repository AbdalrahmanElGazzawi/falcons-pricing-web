import type { Config } from 'tailwindcss';

// Color tokens come from CSS variables defined in globals.css.
// Light + dark themes swap via [data-theme="dark"] on <html>.
const cssVar = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy:       cssVar('color-navy'),
        navyDark:   cssVar('color-navy-dark'),
        green:      cssVar('color-green'),
        greenDark:  cssVar('color-green-dark'),
        greenSoft:  cssVar('color-green-soft'),
        gold:       cssVar('color-gold'),
        ink:        cssVar('color-ink'),
        label:      cssVar('color-label'),
        mute:       cssVar('color-mute'),
        line:       cssVar('color-line'),
        bg:         cssVar('color-bg'),
        danger:     cssVar('color-danger'),
        amber:      cssVar('color-amber'),
        card:       cssVar('surface-card'),
        cardHover:  cssVar('surface-card-hover'),
        elevated:   cssVar('surface-elevated'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 35, 64, 0.06), 0 1px 3px rgba(11, 35, 64, 0.08)',
        lift: '0 4px 12px rgba(11, 35, 64, 0.1), 0 2px 4px rgba(11, 35, 64, 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
