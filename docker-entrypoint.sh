#!/bin/sh
# Applies any pending Prisma migrations before the server starts.
# DATABASE_URL is available at runtime (from .env.local via docker-compose).
npx prisma migrate deploy
exec node server.js
