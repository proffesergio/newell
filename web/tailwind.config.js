/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12241B",
        paper: "#F5F3EC",
        chlorophyll: "#7BE05A",
        moss: "#3A5A40",
        sage: "#A7B8AA",
        clay: "#D98E5A",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.375rem", { lineHeight: "1.4" }],
        "2xl": ["1.75rem", { lineHeight: "1.3" }],
        "3xl": ["2.25rem", { lineHeight: "1.15" }],
        "4xl": ["3rem", { lineHeight: "1.08" }],
      },
      boxShadow: {
        card: "0 30px 80px -30px rgba(18, 36, 27, 0.55)",
      },
      keyframes: {
        unfurl: {
          "0%": { transform: "scale(0.2) rotate(-18deg)", opacity: "0" },
          "60%": { transform: "scale(1.08) rotate(4deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
      animation: {
        unfurl: "unfurl 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      },
    },
  },
  plugins: [],
};
