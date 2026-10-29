import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Theme tokens from shared/styles/theme.css — use bg-card, text-fg, border-border, ...
      colors: {
        fg: 'var(--fg)',
        bg: 'var(--bg)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        card: 'var(--card)',
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['SF Mono', 'mono'],
      },
    },
  },
  plugins: [],
} satisfies Config;