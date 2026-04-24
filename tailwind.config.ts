import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:       '#0B2340',
        navyDark:   '#061628',
        green:      '#2ED06E',
        greenDark:  '#26A657',
        greenSoft:  '#E9F9EE',
        gold:       '#D4A514',
        ink:        '#222C3B',
        label:      '#5A6678',
        mute:       '#94A3B8',
        line:       '#E4E8EE',
        bg:         '#F7F9FB',
        danger:     '#E53935',
        amber:      '#F7B500',
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
