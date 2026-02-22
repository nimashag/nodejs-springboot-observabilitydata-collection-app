/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'log-error': '#ef4444',
        'log-warn': '#f59e0b',
        'log-info': '#3b82f6',
        'log-debug': '#6b7280',
        'primary': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'sidebar-bg': '#1e293b',
        'sidebar-active': '#334155',
        'sidebar-hover': '#475569',
      },
    },
  },
  plugins: [],
};

