# Niffer Cosmetics Backend API

Production-ready Node.js + Express + TypeScript + Prisma API for the Tanzania beauty e-commerce platform.

## Stack

- **Node.js + Express + TypeScript**
- **Prisma ORM** + SQLite (easy local) → PostgreSQL ready
- **JWT Auth** (phone + password)
- **Pesapal API 3.0** (sandbox & live)
- **Referral & Commission** system
- **Admin** endpoints for orders, inventory, dashboard

## Quick Start

```bash
cd backend

# 1. Install
npm install

# 2. Setup DB + seed
npx prisma generate
npx prisma db push
npm run db:seed

# 3. Run
npm run dev
```

API will be at **http://localhost:4000**

### Demo Accounts (from seed)

| Role     | Phone         | Password  |
|----------|---------------|-----------|
| Admin    | 255700000001  | admin123  |
| Customer | 255712345678  | demo123   |

## Main Endpoints

### Auth
- `POST /api/auth/register` – { name, phone, password, referralCode? }
- `POST /api/auth/login` – { phone, password }
- `GET  /api/auth/me` – Bearer token

### Products
- `GET /api/products` – ?category=&search=&featured=&page=
- `GET /api/products/:slug`
- `GET /api/products/meta/categories`
- `POST /api/products` – Admin only
- `PATCH /api/products/:id/stock` – Admin only

### Orders
- `POST /api/orders` – Create order (guest or logged in)
- `GET  /api/orders/my` – User orders
- `GET  /api/orders/:orderNumber`

### Payments (Pesapal)
- `POST /api/payments/initiate` – { orderNumber } → returns redirect_url
- `POST /api/payments/ipn` – Pesapal webhook
- `GET  /api/payments/status/:orderNumber`

### Referrals
- `GET /api/referrals/dashboard` – Auth required

### Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/products`

## Environment

Copy `.env.example` → `.env` and fill:

- `PESAPAL_CONSUMER_KEY` / `SECRET` from https://developer.pesapal.com
- `PESAPAL_ENV=sandbox` or `live`
- Africa's Talking keys for SMS (next phase)

## Pesapal Setup (Sandbox)

1. Create account at developer.pesapal.com
2. Get sandbox consumer key & secret
3. Register IPN URL (your public `/api/payments/ipn`)
4. Put the returned `ipn_id` in `PESAPAL_IPN_ID`
5. Test with sandbox phone numbers provided by Pesapal

## Next Steps Already Scaffolded

- SMS confirmations (Africa's Talking service ready to plug)
- Real image uploads
- Full admin UI
- PostgreSQL switch (just change `provider` + `DATABASE_URL`)

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── index.ts
│   ├── middleware/
│   ├── routes/
│   ├── services/     # pesapal.ts
│   └── utils/
├── .env
└── package.json
```
