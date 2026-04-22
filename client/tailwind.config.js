/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf4",
          100: "#d7f5e3",
          500: "#22c55e",
          700: "#15803d",
          950: "#052e16",
        },
      },
    },
  },
  plugins: [],
};
