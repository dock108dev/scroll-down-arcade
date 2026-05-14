import type { Config } from "tailwindcss";

// Theme extensions for Tailwind v4. Loaded by `globals.css` via the
// `@config` directive so that arcade utility classes (e.g. `bg-arcade-bg`,
// `text-arcade-accent`, `border-tier-extreme`, `bg-result-good`) resolve to
// the CSS custom properties declared in `src/styles/globals.css`.
//
// Components should still prefer raw `var(--token)` references in style
// attributes for cases where Tailwind classnames are inconvenient — the
// utility classes here are a convenience layer, not the source of truth.
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: "var(--arcade-bg)",
          surface: "var(--arcade-surface)",
          border: "var(--arcade-border)",
          text: "var(--arcade-text)",
          muted: "var(--arcade-muted)",
          accent: "var(--arcade-accent)",
        },
        tier: {
          extreme: "var(--tier-extreme)",
          high: "var(--tier-high)",
          medium: "var(--tier-medium)",
          low: "var(--tier-low)",
        },
        result: {
          perfect: "var(--result-perfect)",
          good: "var(--result-good)",
          okay: "var(--result-okay)",
          early: "var(--result-early)",
          late: "var(--result-late)",
          miss: "var(--result-miss)",
          ball: "var(--result-ball)",
          hanger: "var(--result-hanger)",
          "competitive-miss": "var(--result-competitive-miss)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
