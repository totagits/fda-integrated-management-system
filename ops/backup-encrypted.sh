#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT must contain an age public recipient}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE must be an offsite rclone destination}"
command -v pg_dump >/dev/null || { echo 'pg_dump is required' >&2; exit 1; }
command -v age >/dev/null || { echo 'age is required' >&2; exit 1; }
command -v rclone >/dev/null || { echo 'rclone is required' >&2; exit 1; }
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fda}"
UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d "${BACKUP_DIR}/.work-${STAMP}.XXXXXX")"
BUNDLE="${BACKUP_DIR}/fda-${STAMP}.tar.gz.age"
trap 'rm -rf "$WORK"' EXIT
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$WORK/database.dump"
if [[ -d "$UPLOADS_DIR" ]]; then tar -C "$UPLOADS_DIR" -czf "$WORK/attachments.tar.gz" .; else mkdir -p "$WORK/empty-uploads"; tar -C "$WORK/empty-uploads" -czf "$WORK/attachments.tar.gz" .; fi
printf 'created_at=%s\n' "$STAMP" > "$WORK/manifest.txt"
sha256sum "$WORK/database.dump" "$WORK/attachments.tar.gz" > "$WORK/SHA256SUMS"
tar -C "$WORK" -czf - . | age -r "$BACKUP_AGE_RECIPIENT" -o "$BUNDLE"
sha256sum "$BUNDLE" > "${BUNDLE}.sha256"
rclone copy "$BUNDLE" "$BACKUP_REMOTE"
rclone copy "${BUNDLE}.sha256" "$BACKUP_REMOTE"
find "$BACKUP_DIR" -type f -name 'fda-*.tar.gz.age' -mtime +30 -delete
find "$BACKUP_DIR" -type f -name 'fda-*.tar.gz.age.sha256' -mtime +30 -delete
echo "Encrypted database and attachment bundle copied offsite: $BUNDLE"
