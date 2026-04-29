# Development and Docker Deployment

## Prerequisites

- Docker Desktop or another Docker engine is running.
- Port `3000` is available for the app, unless you change `APP_PORT`.
- Port `55432` is available for Postgres on the host, unless you change `POSTGRES_PORT`.

## Environment

1. Copy `.env.example` to `.env`.
2. Read the Chinese comments in `.env` and adjust values for your machine or deployment.
3. Update at least these values before production use:
   - `SESSION_SECRET`
   - `SEED_ADMIN_PASSWORD`
   - `POSTGRES_PASSWORD`
   - `OSS_REGION`
   - `OSS_BUCKET`
   - `OSS_ACCESS_KEY_ID`
   - `OSS_ACCESS_KEY_SECRET`
   - `OSS_PUBLIC_BASE_URL`
   - `OSS_UPLOAD_BASE_URL`

`.env` is ignored by git. Keep real secrets only in `.env` or your deployment secret manager.

Use `DATABASE_URL` for local commands that run on the host, such as `npx prisma db push`. Keep its host as `127.0.0.1` on Windows/Docker Desktop so Prisma does not try IPv6 `localhost`.

Use `DOCKER_DATABASE_URL` for the containerized app. The host must stay as the Docker Compose service name `postgres`.

## Local Development Start

```bash
docker compose up -d postgres
npx prisma db push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`, or the port configured by `APP_PORT`.

## Docker App Start

```bash
docker compose up -d --build
```

The app container will automatically:

- wait for Postgres to become healthy
- run the legacy admin migration and `prisma db push`
- seed the protected admin account `admin@example.com` and default tags
- start Next.js on port `3000`

Open `http://localhost:3000`, or the port configured by `APP_PORT`.

## Logs

```bash
docker compose logs -f app
docker compose logs -f postgres
```

## Stop

```bash
docker compose down
```

To remove the database volume as well:

```bash
docker compose down -v
```
