# Emish Beauty Spa — Production Guide

## 1. Database

**Local (default):** SQLite via `DATABASE_URL="file:./dev.db"`

**Production (recommended):** PostgreSQL

1. Create a Postgres database (Railway, Neon, Supabase, DigitalOcean, etc.)
2. In `prisma/schema.prisma` change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Set:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/niffer?schema=public"
```

4. Run:

```bash
npx prisma migrate dev --name init
# or
npx prisma db push
npm run db:seed
```

---

## 2. Pesapal (Sandbox → Live)

1. Create account: https://developer.pesapal.com  
2. Get **Consumer Key** & **Consumer Secret**  
   - Demo keys list: https://developer.pesapal.com/api3-demo-keys.txt  
3. Put in `.env`:

```
PESAPAL_CONSUMER_KEY=...
PESAPAL_CONSUMER_SECRET=...
PESAPAL_ENV=sandbox
```

4. Expose IPN publicly (ngrok for testing, real HTTPS domain for live):

```
PESAPAL_IPN_URL=https://your-api.example.com/api/payments/ipn
PESAPAL_CALLBACK_URL=https://your-shop.example.com/payment-callback.html
```

5. Register IPN once:

```bash
npm run pesapal:register-ipn
```

Copy `PESAPAL_IPN_ID=...` into `.env`.

6. Go **live**: set `PESAPAL_ENV=live` and use live merchant keys from Pesapal dashboard.

Supported in TZ: M-Pesa, Tigo/Mixx by Yas, Airtel Money, cards.

---

## 3. SMS (Africa’s Talking)

```bash
npm install africastalking
```

```
AT_USERNAME=sandbox          # or your live username
AT_API_KEY=...
AT_SENDER_ID=NIFFER          # must be approved for live TZ traffic
```

SMS is sent automatically when payment completes (IPN).

---

## 4. Security checklist

- [ ] Strong `JWT_SECRET` (32+ random chars)
- [ ] `NODE_ENV=production`
- [ ] HTTPS only (API + storefront)
- [ ] CORS `APP_URL` set to real domain(s)
- [ ] Change default admin password after first login
- [ ] Rate limits enabled (already in code)
- [ ] Helmet enabled
- [ ] Do not commit `.env`

---

## 5. Deploy outline

| Piece | Example hosts |
|-------|----------------|
| API (Node) | Railway, Render, VPS (PM2), Fly.io |
| Postgres | Neon, Supabase, Railway |
| Frontend static | Vercel, Netlify, Cloudflare Pages, or same VPS |
| Uploads | Local disk only for small scale → move to S3/Cloudinary later |

Build API:

```bash
npm run build
npm start
```

Point frontend `localStorage niffer_api_url` or hardcode production API in `js/api.js`.

---

## 6. Admin

- URL: `/admin.html`
- Default: `255700000001` / `admin123` — **change immediately**
- Inventory, order status, low-stock alerts

---

## 7. Product images

- Seed uses Unsplash URLs (replace with your own).
- Upload via `POST /api/uploads/image` (admin JWT) with base64 data URL.
- Or host on Cloudinary and store URLs in product `images` JSON array.
