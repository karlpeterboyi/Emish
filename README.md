# Emish Beauty Spa

E-commerce + spa **services booking** for the Tanzania market.  
Bilingual EN/SW · Pesapal-ready · Referrals · Admin · SMS hooks

## Quick start (Windows / Mac / Linux / Termux)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # if needed
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```
→ http://localhost:4000

### Frontend
```bash
# from project root
npx serve .
```
→ http://localhost:3000

**Termux:** see [TERMUX.md](./TERMUX.md)

## Database

**Default (Termux & local):** SQLite  
`DATABASE_URL="file:./dev.db"` in `backend/.env`

**PostgreSQL (production):**

1. Create a database (Neon, Supabase, Railway, VPS, etc.)
2. In `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
3. Set:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/emish?schema=public"
```
4. Run:
```bash
npx prisma db push
npm run db:seed
```

## Modules

| Area | Path |
|------|------|
| Shop | `products.html`, `cart.html`, `checkout.html` |
| Spa services | `services.html` |
| Booking | `booking.html` |
| Admin | `admin.html` |
| API | `/api/products`, `/api/services`, `/api/bookings`, `/api/orders`, `/api/payments` |

## Demo accounts

| Role | Phone | Password |
|------|-------|----------|
| Admin | 255700000001 | admin123 |
| Customer | 255712345678 | demo123 |

## Production

See `backend/PRODUCTION.md` for Pesapal, SMS, HTTPS, and deploy notes.
