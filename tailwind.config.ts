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
        page:             "var(--color-page)",
        surface:          "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-hi":     "var(--color-surface-hi)",

        // Borders
        border:           "var(--color-border)",
        "border-strong":  "var(--color-border-strong)",

        // Text
        primary:          "var(--color-text-primary)",
        "ink-1":          "var(--color-ink-1)",
        secondary:        "var(--color-text-secondary)",
        tertiary:         "var(--color-text-tertiary)",
        "ink-4":          "var(--color-ink-4)",

        // Accent (crimson)
        accent: {
          DEFAULT: "var(--color-accent)",
          hover:   "var(--color-accent-hover)",
          muted:   "var(--color-accent-muted)",
        },
        "crimson-soft":   "var(--color-crimson-soft)",
        "crimson-line":   "var(--color-crimson-line)",

        // Priority
        p1: "var(--color-p1)",
        p2: "var(--color-p2)",
        p3: "var(--color-p3)",

        // Tag/category colors
        "tag-blue":       "var(--color-tag-blue)",
        "tag-blue-bg":    "var(--color-tag-blue-bg)",
        "tag-rose":       "var(--color-tag-rose)",
        "tag-rose-bg":    "var(--color-tag-rose-bg)",
        "tag-green":      "var(--color-tag-green)",
        "tag-green-bg":   "var(--color-tag-green-bg)",
        "tag-amber":      "var(--color-tag-amber)",
        "tag-amber-bg":   "var(--color-tag-amber-bg)",
        "tag-violet":     "var(--color-tag-violet)",
        "tag-violet-bg":  "var(--color-tag-violet-bg)",
        "tag-slate":      "var(--color-tag-slate)",
        "tag-slate-bg":   "var(--color-tag-slate-bg)",
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xs:   '4px',
        sm:   '6px',
        DEFAULT: '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl': '24px',
        pill: '999px',
      },
      boxShadow: {
        '1':   'var(--shadow-1)',
        '2':   'var(--shadow-2)',
        '3':   'var(--shadow-3)',
        'pop': 'var(--shadow-pop)',
      },
      letterSpacing: {
        'display': '-0.045em',
      },
    },
  },
  plugins: [],
};

export default config;
