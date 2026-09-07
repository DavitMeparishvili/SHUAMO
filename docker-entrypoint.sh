#!/bin/sh
set -eu

# Idempotently bring the database schema up to date before accepting traffic.
node_modules/.bin/prisma migrate deploy
exec node server.js
