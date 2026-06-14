/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d9f1ff',
          200: '#bce6ff',
          300: '#8ed7ff',
          400: '#59bfff',
          500: '#33a1ff',
          600: '#1b81f5',
          700: '#1668e1',
          800: '#1854b6',
          900: '#194a8f',
          950: '#142e57',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#d5d9e8',
          300: '#b0b8d1',
          400: '#8590b4',
          500: '#646f99',
          600: '#4f587f',
          700: '#414867',
          800: '#383d57',
          900: '#21243a',
          950: '#141627',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.18)',
        glow: '0 0 0 1px rgba(51,161,255,.25), 0 8px 40px -8px rgba(51,161,255,.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(51,161,255,.45)' },
          '70%': { boxShadow: '0 0 0 12px rgba(51,161,255,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(51,161,255,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
}
