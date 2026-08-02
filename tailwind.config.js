/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f3f4f6',
        page: '#ffffff',
      },
    },
  },
  plugins: [],
};
