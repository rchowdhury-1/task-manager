/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        'primary-dark': '#059669',
        accent: '#f97316',
        bg: '#0a0a0a',
        'bg-2': '#111111',
        surface: '#1a1a1a',
        'surface-2': '#222222',
        'text-base': '#f1f5f9',
        'text-muted': '#94a3b8',
      },
      borderColor: {
        DEFAULT: 'rgba(16, 185, 129, 0.2)',
      },
    },
  },
  plugins: [],
};
