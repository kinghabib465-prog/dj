/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a202c", // dark navy/charcoal
        accent: "#d4af37", // gold
        secondary: "#6b46c1", // restrained purple
        success: "#38a169", // green
        warning: "#dd6b20", // orange
        danger: "#e53e3e", // red
        info: "#3182ce", // blue
      },
      fontFamily: {
        sans: ["Cairo", "sans-serif"],
      },
    },
  },
  plugins: [],
};
