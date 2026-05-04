import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        "surface-01": "var(--color-surface-01)",
        "surface-02": "var(--color-surface-02)",
        "surface-03": "var(--color-surface-03)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-tertiary": "var(--color-text-tertiary)",
        "border-subtle": "var(--color-border-subtle)",
        "border-default": "var(--color-border-default)",
        iris: "var(--color-iris)",
        jade: "var(--color-jade)",
        amber: "var(--color-amber)",
        coral: "var(--color-coral)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
