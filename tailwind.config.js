/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shopee: {
          primary: '#EE4D2D',
          hover: '#D03E1F',
          light: '#FFF5F1',
          dark: '#B02A0B',
        },
        tiktok: {
          yellow: '#FFE600',
          red: '#FE2C55',
          cyan: '#25F4EE',
          dark: '#121212',
        }
      }
    },
  },
  plugins: [],
}

