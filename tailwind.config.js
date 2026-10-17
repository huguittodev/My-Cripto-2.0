/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        crypto: {
          // Fondos y superficies SaaS azul
          bg: "#0B1020",
          surface: {
            DEFAULT: "#111A2E",
            hover: "#18243B",
            raised: "#1C2942",
          },
          "surface-hover": "#18243B",
          "surface-raised": "#1C2942",
          border: {
            DEFAULT: "#293750",
            hover: "#3B4E70",
          },
          "border-hover": "#3B4E70",

          // Marca azul
          primary: {
            DEFAULT: "#3B82F6",
            hover: "#2563EB",
            soft: "#172D50",
          },
          "primary-hover": "#2563EB",
          "primary-soft": "#172D50",
          accent: {
            DEFAULT: "#60A5FA",
            strong: "#93C5FD",
          },
          "accent-strong": "#93C5FD",

          // Jerarquía de texto
          text: {
            DEFAULT: "#F1F5F9",
            secondary: "#A7B4C8",
            muted: "#77869F",
          },
          "text-secondary": "#A7B4C8",
          "text-muted": "#77869F",

          // Estados financieros y feedback
          positive: {
            DEFAULT: "#22C55E",
            soft: "rgba(34, 197, 94, 0.15)",
          },
          "positive-soft": "rgba(34, 197, 94, 0.15)",
          negative: {
            DEFAULT: "#F87171",
            soft: "rgba(248, 113, 113, 0.15)",
          },
          "negative-soft": "rgba(248, 113, 113, 0.15)",
          warning: "#FBBF24",
          info: "#38BDF8",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
