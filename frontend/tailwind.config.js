export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background))',
        surface: 'rgb(var(--color-surface))',
        border: 'rgb(var(--color-border))',
        text: {
          DEFAULT: 'rgb(var(--color-text))',
          muted: 'rgb(var(--color-text-muted))',
        },
        primary: {
          DEFAULT: 'rgb(var(--color-primary))',
          strong: 'rgb(var(--color-primary-strong))',
          hover: 'rgb(var(--color-primary-hover))',
          soft: 'rgb(var(--color-primary-soft))',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success))',
          strong: 'rgb(var(--color-success-strong))',
          soft: 'rgb(var(--color-success-soft))',
        },
        warning: {
          DEFAULT: 'rgb(var(--color-warning))',
          strong: 'rgb(var(--color-warning-strong))',
          soft: 'rgb(var(--color-warning-soft))',
        },
        danger: {
          DEFAULT: 'rgb(var(--color-danger))',
          strong: 'rgb(var(--color-danger-strong))',
          soft: 'rgb(var(--color-danger-soft))',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Cairo', 'Tahoma', 'sans-serif'],
      },
      borderRadius: { md: '8px', lg: '12px', xl: '16px' },
      boxShadow: {
        sm: '0 1px 2px rgba(15,23,42,.06)',
        md: '0 4px 12px rgba(15,23,42,.08)',
      },
      transitionDuration: { DEFAULT: '150ms' },
      transitionTimingFunction: { DEFAULT: 'ease-out' },
    },
  },
  plugins: [],
}
