/** @type {import('tailwindcss').Config} */

// Función auxiliar para admitir opacidades dinámicas en Tailwind usando CSS variables en RGB
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        crypto: {
          // Fondos y superficies SaaS azul
          bg: withOpacity("--crypto-bg"),
          surface: {
            DEFAULT: withOpacity("--crypto-surface"),
            hover: withOpacity("--crypto-surface-hover"),
            raised: withOpacity("--crypto-surface-raised"),
          },
          "surface-hover": withOpacity("--crypto-surface-hover"),
          "surface-raised": withOpacity("--crypto-surface-raised"),
          border: {
            DEFAULT: withOpacity("--crypto-border"),
            hover: withOpacity("--crypto-border-hover"),
          },
          "border-hover": withOpacity("--crypto-border-hover"),

          // Marca azul
          primary: {
            DEFAULT: withOpacity("--crypto-primary"),
            hover: withOpacity("--crypto-primary-hover"),
            soft: withOpacity("--crypto-primary-soft"),
          },
          "primary-hover": withOpacity("--crypto-primary-hover"),
          "primary-soft": withOpacity("--crypto-primary-soft"),
          accent: {
            DEFAULT: withOpacity("--crypto-accent"),
            strong: withOpacity("--crypto-accent-strong"),
          },
          "accent-strong": withOpacity("--crypto-accent-strong"),

          // Jerarquía de texto
          text: {
            DEFAULT: withOpacity("--crypto-text"),
            secondary: withOpacity("--crypto-text-secondary"),
            muted: withOpacity("--crypto-text-muted"),
          },
          "text-secondary": withOpacity("--crypto-text-secondary"),
          "text-muted": withOpacity("--crypto-text-muted"),

          // Estados financieros y feedback
          positive: {
            DEFAULT: withOpacity("--crypto-positive"),
            soft: "var(--crypto-positive-soft)",
          },
          "positive-soft": "var(--crypto-positive-soft)",
          negative: {
            DEFAULT: withOpacity("--crypto-negative"),
            soft: "var(--crypto-negative-soft)",
          },
          "negative-soft": "var(--crypto-negative-soft)",
          warning: withOpacity("--crypto-warning"),
          info: withOpacity("--crypto-info"),
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
