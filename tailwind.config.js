/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        tactical: {
          blue: '#1E40AF',
          'blue-light': '#3B82F6',
          'blue-dark': '#1E3A8A',
        },
        gold: {
          DEFAULT: '#EAB308',
          light: '#FACC15',
          dark: '#CA8A04',
        },
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        military: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
