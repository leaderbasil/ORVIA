export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: { DEFAULT: '#1E293B', muted: '#64748B' },
        primary: { DEFAULT: '#6366F1', strong: '#4F46E5', hover: '#4338CA', soft: '#EEF2FF' },
        success: { DEFAULT: '#16A34A', strong: '#15803D', soft: '#F0FDF4' },
        warning: { DEFAULT: '#D97706', strong: '#B45309', soft: '#FFFBEB' },
        danger: { DEFAULT: '#DC2626', strong: '#B91C1C', soft: '#FEF2F2' },
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
