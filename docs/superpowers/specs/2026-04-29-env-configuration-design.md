# Env Configuration Design

## Goal

Unify all runtime configuration around `.env` so a developer can copy `.env.example` to `.env`, adjust values, then start local development with:

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
npm run dev
```

## Architecture

`.env.example` is the source template for every configuration key used by Docker Compose, Prisma, seed scripts, Playwright, Next.js runtime code, and OSS upload helpers. Docker Compose reads `.env` for interpolation and exposes Postgres to the host so Prisma CLI commands can use `DATABASE_URL`.

The application keeps the existing runtime reads from `process.env`; this change does not add a new config abstraction because the request is about centralizing configuration documentation and defaults, not changing runtime behavior.

## Files

- `.env.example`: complete Chinese-commented configuration template.
- `docker-compose.yml`: consume `.env` variables consistently and expose Postgres host port.
- `docs/docker-deploy.md`: document the approved development startup flow and Docker app startup flow.
- `tests/unit/env-example.test.ts`: guard that the template covers required configuration.

## Testing

Unit tests verify `.env.example` contains required variables and that Docker Compose no longer hides local Postgres behind an unexposed container port. Full verification uses lint, unit tests, Prisma schema push, seed, and a development server smoke check.
