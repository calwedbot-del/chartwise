/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'chart-bg': '#131722',
        'chart-border': '#2A2E39',
        'bull': '#26a69a',
        'bear': '#ef5350',
      },
    },
  },
  plugins: [],
}
