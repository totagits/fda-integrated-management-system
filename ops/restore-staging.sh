#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${1:?Usage: restore-staging.sh encrypted-backup.tar.gz.age}"
: "${RESTORE_DATABASE_URL:?Set RESTORE_DATABASE_URL to an empty staging database}"
: "${AGE_IDENTITY_FILE:?Set AGE_IDENTITY_FILE to the private restore key path}"
: "${RESTORE_TARGET_LABEL:?Set RESTORE_TARGET_LABEL=staging to confirm the restore target}"
: "${RESTORE_UPLOADS_DIR:?Set RESTORE_UPLOADS_DIR to an empty staging uploads directory}"
[[ "$RESTORE_TARGET_LABEL" == "staging" ]] || { echo 'Restore is restricted to a target labeled staging.' >&2; exit 1; }
command -v age >/dev/null || { echo 'age is required' >&2; exit 1; }
command -v pg_restore >/dev/null || { echo 'pg_restore is required' >&2; exit 1; }
command -v psql >/dev/null || { echo 'psql is required' >&2; exit 1; }
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
age -d -i "$AGE_IDENTITY_FILE" "$1" | tar -xz -C "$WORK"
(cd "$WORK" && sha256sum -c SHA256SUMS)
TABLES="$(psql "$RESTORE_DATABASE_URL" -Atqc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")"
[[ "$TABLES" == "0" ]] || { echo 'Restore target database is not empty; refusing to overwrite it.' >&2; exit 1; }
mkdir -p "$RESTORE_UPLOADS_DIR"
[[ -z "$(find "$RESTORE_UPLOADS_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]] || { echo 'Staging uploads directory is not empty; refusing to overwrite it.' >&2; exit 1; }
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname "$RESTORE_DATABASE_URL" "$WORK/database.dump"
tar -xzf "$WORK/attachments.tar.gz" -C "$RESTORE_UPLOADS_DIR"
echo "Database and attachments restored into the explicitly labeled staging target: $RESTORE_TARGET_LABEL"
