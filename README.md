# Scroll Down Arcade

Arcade-style MLB catch-up experience. Next.js 16 + React 19 + TypeScript 6 +
Tailwind v4 + Zustand 5 + Vitest.

## Run

```bash
npm ci
npm run dev   # http://localhost:3002
```

## Design tokens

All colour, tier, and result-flash hues live as CSS custom properties in
[`src/styles/globals.css`](src/styles/globals.css). Components reference them
via `var(--token)` or via the Tailwind utilities declared in
[`tailwind.config.ts`](tailwind.config.ts) (e.g. `bg-arcade-bg`,
`text-arcade-accent`, `border-tier-extreme`). No hex literals in component
files — that's how the theme stays swappable.

## Layout

```
src/
  app/         # Next.js routes (App Router) + BFF routes under app/api
  components/  # Shared React components
  hooks/       # Reusable React hooks
  lib/         # Pure helpers, formatters, API clients
  stores/      # Zustand stores
  styles/      # globals.css + design tokens
  types/       # Shared TS types
tests/
  unit/        # Vitest suites
```

## Scripts

| Command          | What                       |
|------------------|----------------------------|
| `npm run dev`    | Next.js dev server :3002   |
| `npm run build`  | Production build           |
| `npm run start`  | Run production build :3002 |
| `npm run lint`   | ESLint                     |
| `npm run typecheck` | `tsc --noEmit`          |
| `npm test`       | Vitest run                 |
