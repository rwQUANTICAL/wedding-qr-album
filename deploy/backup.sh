#!/usr/bin/env bash
# Nächtliches Backup von /data. Ziel wird über BACKUP_TARGET gesetzt (rsync-Syntax, z.B. user@host:/backups/wedding).
# Cron: 0 3 * * * /opt/weddingphotos/deploy/backup.sh >> /var/log/wedding-backup.log 2>&1
set -euo pipefail
TARGET="${BACKUP_TARGET:?BACKUP_TARGET fehlt}"
sqlite3 /data/db/wedding.sqlite ".backup /data/db/wedding.backup.sqlite"
rsync -az --delete --exclude 'wedding.sqlite' --exclude 'wedding.sqlite-*' /data/ "$TARGET"
echo "$(date -Is) backup ok"
