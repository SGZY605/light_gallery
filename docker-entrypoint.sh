#!/bin/sh
set -eu

max_attempts="${DB_INIT_MAX_ATTEMPTS:-30}"
retry_delay="${DB_INIT_RETRY_DELAY_SECONDS:-2}"
attempt=1

echo "Waiting for database schema sync..."
until npx prisma db execute --file prisma/pre-schema-sync.sql --url "$DATABASE_URL" && npx prisma db push --skip-generate --accept-data-loss; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database initialization failed after ${max_attempts} attempts." >&2
    exit 1
  fi

  echo "Database not ready yet. Retrying in ${retry_delay}s (${attempt}/${max_attempts})..."
  attempt=$((attempt + 1))
  sleep "$retry_delay"
done

case "${RUN_DB_SEED:-true}" in
  true|TRUE|1|yes|YES)
    echo "Seeding database..."
    npm run db:seed
    ;;
  *)
    echo "Skipping database seed."
    ;;
esac

exec npm run start
