/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3182BD',
          50: '#E8F2F9',
          100: '#D1E5F3',
          200: '#A3CBE7',
          300: '#75B1DB',
          400: '#4797CF',
          500: '#3182BD',
          600: '#276898',
          700: '#1D4E72',
          800: '#13344C',
          900: '#091A26',
        },
      },
    },
  },
  plugins: [],
}
