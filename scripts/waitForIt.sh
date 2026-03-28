#!/bin/sh

echo "Build complete. Initializing database..."
echo "Please wait (typically 10-20 seconds)..."

until pg_isready -h "db_hostname" -p 5432 -U "user"; do
  echo "Database is starting up - still waiting..."
  sleep 2
done

echo "--------------------------------------------------"
echo "SUCCESS: Database is ready for connections!"
echo "--------------------------------------------------"