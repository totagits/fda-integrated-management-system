#!/bin/sh
set -eu

mkdir -p "${UPLOADS_DIR:-/data/uploads}"
chown node:node "${UPLOADS_DIR:-/data/uploads}"
exec su-exec node:node node /app/server/index.js
