/** @type {import('tailwindcss').Config} */
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    tailwindcss,
    autoprefixer
  ],
}