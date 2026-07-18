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
        primary: { DEFAULT: "#d96d27", foreground: "#fefbf8" },
        secondary: { DEFAULT: "#f1eae0", foreground: "#362c24" },
        muted: { DEFAULT: "#f3ede6", foreground: "#6c6158" },
        accent: { DEFAULT: "#f0dac2", foreground: "#3a2a20" },
        destructive: { DEFAULT: "#ce403a", foreground: "#fefbf8" },
        border: "#e3ddd5",
        input: "#e9e4dc",
        // Darkened from the design's oklch values to pass WCAG AA as text
        // on cream cards (success 5.0:1, warning 4.95:1 on #fffdfa).
        success: { DEFAULT: "#2f7d45", foreground: "#fefbf8" },
        warning: { DEFAULT: "#b45309", foreground: "#fefbf8" },
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
