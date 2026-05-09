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
        // Surfaces
        page:            "var(--color-page)",
        surface:         "var(--color-surface)",
        "surface-raised":"var(--color-surface-raised)",

        // Border
        border:          "var(--color-border)",

        // Text (short names → text-primary, text-secondary, text-tertiary)
        primary:         "var(--color-text-primary)",
        secondary:       "var(--color-text-secondary)",
        tertiary:        "var(--color-text-tertiary)",

        // Accent
        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
          muted:   "var(--color-accent-muted)",
        },

        // Priority
        p1: "var(--color-p1)",
        p2: "var(--color-p2)",
        p3: "var(--color-p3)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
