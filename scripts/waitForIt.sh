#!/bin/sh
SECONDS=0

echo "Build complete. Starting database connection check..."

until pg_isready -h "$DB_HOSTNAME" -p 5432 -U "$DB_USER" > /dev/null 2>&1; do
  echo "Waiting for Database ($DB_HOSTNAME)... ${SECONDS}s elapsed."
  sleep 5
done

echo "-------------------------------------------"
echo "SUCCESS: Database ready after ${SECONDS} seconds."
echo "-------------------------------------------"