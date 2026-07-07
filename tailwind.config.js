/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#16a34a",
        surface: "#ffffff",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};
