/** @type {import('tailwindcss').Config} */
// Design tokens lifted from the Lovable design (lazy-meal-planner.lovable.app),
// warm terracotta/cream palette, generous radii.
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#fdfaf4",
        foreground: "#291f18",
        card: "#fffdfa",
        primary: { DEFAULT: "#a55a37", foreground: "#fefbf8" },
        secondary: { DEFAULT: "#f1eae0", foreground: "#362c24" },
        muted: { DEFAULT: "#f3ede6", foreground: "#6c6158" },
        accent: { DEFAULT: "#f0dac2", foreground: "#3a2a20" },
        destructive: { DEFAULT: "#ce403a", foreground: "#fefbf8" },
        border: "#e3ddd5",
        input: "#e9e4dc",
        success: { DEFAULT: "#429c5a", foreground: "#fefbf8" },
        warning: { DEFAULT: "#e1a035", foreground: "#291f18" },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "26px",
      },
    },
  },
  plugins: [],
};
