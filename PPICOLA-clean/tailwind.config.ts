import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#5457e8",
          700: "#4549d1",
          800: "#3a3da6",
          900: "#343783",
        },
        mint: {
          50: "#effcf7",
          100: "#d7f7ea",
          200: "#b2eed8",
          300: "#7fe0c1",
          400: "#4acaa4",
          500: "#27b089",
          600: "#1a8e6f",
          700: "#17725b",
          800: "#165a4a",
          900: "#144b3e",
        },
        cream: "#faf8f4",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(84, 87, 232, 0.08)",
        lift: "0 16px 40px rgba(84, 87, 232, 0.16)",
        glow: "0 0 0 4px rgba(99, 102, 241, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "var(--font-arabic)", "system-ui", "sans-serif"],
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
