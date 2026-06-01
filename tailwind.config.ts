import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          200: '#EDE0C8',
          300: '#C9A96E',
          400: '#B8864E', // PRIMARY
          500: '#A67340',
          600: '#8B5E30',
        },
        dark: {
          700: '#2E2E2E',
          800: '#1C1C1C', // PRIMARY DARK
          900: '#111111',
        },
        cream: {
          50:  '#FDFAF5', // background body
          100: '#F7F0E3', // surface cards
          200: '#EDE0C8',
          300: '#D9C9A8',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-lato)', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
