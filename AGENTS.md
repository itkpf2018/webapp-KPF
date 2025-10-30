# Repository Guidelines

The attendance PWA follows a feature-oriented Next.js App Router layout. Use this guide to keep contributions consistent and review-ready.

## Project Structure & Module Organization
- Place user-facing routes in `src/app`, keeping feature bundles like `src/app/admin` or `src/app/sales` self-contained.
- Co-locate API handlers under the owning route (`src/app/.../route.ts`) or `src/app/api/<feature>` so staging links test the entire flow.
- Share UI primitives via `src/components`, cross-cutting helpers in `src/lib`, typed env contracts in `types`, datasets in `data`, and static assets in `public`.
- Mirror feature folders under `src/__tests__` (for example `src/__tests__/app/sales`) to keep coverage dashboards aligned.

## Build, Test, and Development Commands
- `npm run dev` starts Turbopack locally; default port 3000.
- `npm run build` and `npm run start` validate the optimized bundle before shipping routing or config changes.
- `npm run lint` runs ESLint plus formatting checks; prefer `rg` for fast in-repo searches.
- `npx vitest` enters watch mode; `npx vitest run --coverage` is required before a PR merge.

## Coding Style & Naming Conventions
- Write TypeScript with 2-space indentation, trailing semicolons, and explicit return types on exported APIs.
- Use PascalCase for components, hooks, and providers, camelCase for utilities, and SCREAMING_SNAKE_CASE for constants.
- Favor Tailwind classes; add custom styles only in `src/app/globals.css`.
- Keep comments brief and focused on non-obvious logic or domain context.

## Testing Guidelines
- Tests use Vitest with React Testing Library; maintain >=80 percent statements and branches.
- Name suites after the route or hook, for example `src/__tests__/app/HomePage.test.tsx`.
- Mock browser APIs such as `navigator.geolocation` to keep attendance flows deterministic.
- Resolve snapshot failures immediately, then rerun `npx vitest run --coverage` before requesting review.

## Commit & Pull Request Guidelines
- Write imperative commit subjects (`add sales check-in flow`) and squash fixups before pushing.
- PR descriptions should summarize behavior changes, link related issues, and list manual checks (`npm run lint`, `npx vitest run`).
- Attach screenshots for UI updates and apply area labels like `ui`, `api`, or `infrastructure`.
- Confirm CI is green prior to asking for review.

## Security & Configuration Tips
- Store secrets in `.env.local`; provide sanitized examples via `.env.example`.
- Review `next.config.ts` before toggling experimental flags and audit Supabase service-role usage when exports change.
- Maintain redacted backups for attendance datasets to satisfy compliance requirements.
