// Colors come from CSS variables (light/dark). color-mix makes opacity
// modifiers like bg-accent/10 work with them.
const withAlpha = (name) =>
  `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: withAlpha('--color-canvas'),
        surface: withAlpha('--color-surface'),
        'surface-elevated': withAlpha('--color-surface-elevated'),
        border: withAlpha('--color-border'),
        ink: withAlpha('--color-ink'),
        cream: withAlpha('--color-cream'),
        accent: withAlpha('--color-accent'),
        danger: withAlpha('--color-danger'),
        success: withAlpha('--color-success'),
        warning: withAlpha('--color-warning'),
        'text-primary': withAlpha('--color-text'),
        'text-muted': withAlpha('--color-text-muted'),
        hover: withAlpha('--color-hover'),
        'link-blue': withAlpha('--color-link'),
      },
      fontFamily: {
        // Inter has no Arabic letters, so Arabic text uses IBM Plex Sans Arabic.
        sans: ['"Inter Variable"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '24px',
        btn: '14px',
        pill: '999px',
      },
      boxShadow: {
        nav: 'var(--shadow-nav)',
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      letterSpacing: {
        headline: '-0.02em',
        nav: '-0.03em',
      },
    },
  },
  plugins: [],
}
