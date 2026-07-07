/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        campo: {
          verde:   "#1A4D2E",
          naranja: "#E07B39",
          azul:    "#2563A8",
          fondo:   "#F7F5F0",
        },
      },
    },
  },
  plugins: [],
};
