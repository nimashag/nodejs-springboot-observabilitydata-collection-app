/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'log-error': '#ef4444',
        'log-warn': '#f59e0b',
        'log-info': '#3b82f6',
        'log-debug': '#6b7280',
      },
    },
  },
  plugins: [],
};

