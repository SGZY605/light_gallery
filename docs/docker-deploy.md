# Docker Deployment

## Prerequisites

- Docker Desktop or another Docker engine is running.
- Port `3000` is available for the app.
- Port `5432` is available if you want to expose Postgres to the host.

## Environment

1. Copy `.env.example` to `.env`.
2. Update at least these values before production use:
   - `SESSION_SECRET`
   - `SEED_ADMIN_PASSWORD`
   - `OSS_REGION`
   - `OSS_BUCKET`
   - `OSS_ACCESS_KEY_ID`
   - `OSS_ACCESS_KEY_SECRET`
   - `OSS_PUBLIC_BASE_URL`
   - `OSS_UPLOAD_BASE_URL`

Use `DATABASE_URL` for local non-Docker development.

Use `DOCKER_DATABASE_URL` for the containerized app. The default value already points to the `postgres` service inside Docker Compose.

## Start

```bash
docker compose up -d --build
```

The app container will automatically:

- wait for Postgres to become healthy
- run the legacy admin migration and `prisma db push`
- seed the protected admin account `admin@example.com` and default tags
- start Next.js on port `3000`

Open `http://localhost:3000`.

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
