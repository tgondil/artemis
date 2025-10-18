/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D0D0D',
        accent: '#A7C7E7',
        'accent-lavender': '#C8B6E2',
      },
      fontFamily: {
        sans: ['SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        glass: '20px',
      },
      borderRadius: {
        'glass': '16px',
        'glass-lg': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-subtle': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
}

