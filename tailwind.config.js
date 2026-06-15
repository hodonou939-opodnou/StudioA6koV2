/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan every place class names appear so all utilities are generated at build time.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Exact brand palette from the original index.html
      colors: {
        "brand-bg": "#FFF8F0",
        "brand-surface": "#FFFFFF",
        "brand-primary": "#16A34A",
        "brand-secondary": "#E5E7EB",
        "brand-text": "#111827",
        "brand-text-secondary": "#4B5563",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
    },
  },
  // Provides animate-in / fade-in / slide-in-from-bottom-* used across the studio
  plugins: [require("tailwindcss-animate")],
};
