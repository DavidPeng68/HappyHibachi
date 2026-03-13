# CLAUDE.md — Project Conventions

## i18n Rules

1. **No hardcoded user-visible text** — Always use `t('section.key')` in React components.
2. **`en.ts` is the single source of truth** — Add new keys to `en.ts` first, then sync to all 8 locales (zh, es, ko, vi, ja, tl, hi).
3. **No inline fallbacks** — Write `t('hero.title')`, not `t('hero.title', 'Some text')`. The `en.ts` value is the fallback.
4. **Key naming**: `section.subsection.camelCaseKey` (e.g., `booking.form.guestCount`).
5. **Non-React code**: Use `import i18n from '../i18n'; i18n.t('errors.network')`.
6. **Admin strings need i18n too** — The admin dashboard is used by bilingual staff.
7. **Locale files are `.ts` only** — Never create `.json` locale files.
8. **After adding keys**, run `npm run i18n:check` to verify all 8 locales are in sync.

## Tech Stack

- React 18 + TypeScript
- i18next / react-i18next (8 languages: en, zh, es, ko, vi, ja, tl, hi)
- Cloudflare Pages + Workers (KV for bookings)
- ESLint + Prettier + Husky pre-commit hooks

## Pre-commit Checks

The pre-commit hook runs:
1. `lint-staged` — ESLint fix + Prettier on staged files
2. `npm run i18n:check` — Validates all 8 locale files match `en.ts` key structure

## Key Commands

- `npm start` — Dev server
- `npm run lint` — ESLint check
- `npm run type-check` — TypeScript check (`tsc --noEmit`)
- `npm run i18n:check` — Locale file validation
- `npm run build` — Production build
