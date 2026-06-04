/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        border: 'var(--color-border)',
        ink: 'var(--color-ink)',
        cream: 'var(--color-cream)',
        accent: 'var(--color-accent)',
        danger: 'var(--color-danger)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        'text-primary': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        hover: 'var(--color-hover)',
        'link-blue': 'var(--color-link)',
      },
      fontFamily: {
        sans: ['"Sofia Sans"', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '40px',
        btn: '20px',
        pill: '999px',
      },
      boxShadow: {
        nav: 'var(--shadow-nav)',
        card: 'var(--shadow-card)',
      },
      letterSpacing: {
        headline: '-0.02em',
        nav: '-0.03em',
      },
    },
  },
  plugins: [],
}
