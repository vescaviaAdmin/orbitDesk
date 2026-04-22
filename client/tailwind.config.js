/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#ebe9ff",
          200: "#d8d5ff",
          400: "#7c73ff",
          500: "#5b4dff",
          700: "#3423c8",
          900: "#100a37",
        },
        accent: {
          100: "#e8f1ff",
          300: "#8bb6ff",
          500: "#2f6bff",
          700: "#1640c9",
        },
        ink: {
          50: "#ffffff",
          100: "#f3f6ff",
          300: "#cad4f5",
          700: "#1f2750",
          900: "#080b16",
          950: "#02040a",
        },
      },
    },
  },
  plugins: [],
};
