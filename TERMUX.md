# Emish Beauty Spa on Termux (Android)

Prisma prints `unknown OS "android"` and **`prisma db push` often fails** (no schema engine for Android).  
Use the **SQLite SQL init** below instead.

## 1. Packages

```bash
pkg update && pkg upgrade -y
pkg install nodejs git unzip sqlite openssl -y
```

## 2. Project

```bash
cd ~
# after unzipping the project:
cd niffer-cosmetics   # or emish-beauty-spa
cd backend
```

## 3. Install & generate client

```bash
npm install
cp -n .env.example .env

# .env must contain:
# DATABASE_URL="file:./dev.db"

npx prisma generate
```

The Android OS warning is normal. **Generate** usually works; **db push** may not.

## 4. Create database (skip broken db push)

```bash
pkg install sqlite -y
bash scripts/termux-db-init.sh
# or:
# sqlite3 dev.db < prisma/init-sqlite.sql

npm run db:seed
```

## 5. Run API

```bash
npm run dev
```

If the query engine crashes at runtime on Android, use a **remote Postgres** (Neon free tier):

1. Create DB at https://neon.tech  
2. In `prisma/schema.prisma` set `provider = "postgresql"`  
3. In `.env`: `DATABASE_URL="postgresql://..."`  
4. Run `npx prisma db push` **from a PC** once, or use Neon SQL editor  
5. On Termux only: `npx prisma generate` + `npm run dev`  
   (or seed from PC)

## 6. Frontend (new session)

```bash
cd ~/niffer-cosmetics
npx --yes serve . -p 3000
```

Browser: http://127.0.0.1:3000

## Demo logins

| Role | Phone | Password |
|------|-------|----------|
| Admin | 255700000001 | admin123 |
| Customer | 255712345678 | demo123 |

## Pages

- Shop: `/products.html`
- Services: `/services.html`
- Book: `/booking.html`
- Admin: `/admin.html`
