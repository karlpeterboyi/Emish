#!/data/data/com.termux/files/usr/bin/bash
# Emish Beauty Spa — init SQLite without Prisma schema engine (Termux/Android)
set -e
cd "$(dirname "$0")/.."
mkdir -p prisma
DB="${DATABASE_URL#file:}"
DB="${DB:-./prisma/dev.db}"
# If DATABASE_URL is file:./dev.db relative to backend cwd
if [[ -z "$DB" || "$DB" == "./dev.db" || "$DB" == "file:./dev.db" ]]; then
  DB="./dev.db"
fi
DB="${DB#file:}"

echo "==> Using database file: $DB"
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" < prisma/init-sqlite.sql
  echo "==> Tables created with sqlite3"
else
  echo "Install sqlite: pkg install sqlite"
  exit 1
fi
echo "==> Next: npm run db:seed"
