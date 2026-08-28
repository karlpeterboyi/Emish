# Niffer Cosmetics — Full Stack E-Commerce

Premium Skincare & Hair Care for the **Tanzania market**.

Bilingual (English / Kiswahili) • Referral & Commission • Pesapal Mobile Money • Admin Panel

## Structure

```
niffer-cosmetics/
├── index.html, products.html, ...   # Frontend (static)
├── js/                              # Frontend JS + API client
├── admin.html                       # Admin dashboard UI
└── backend/                         # Node.js + Express + Prisma API
    ├── prisma/schema.prisma
    ├── src/
    │   ├── routes/   (auth, products, orders, payments, referrals, admin, uploads)
    │   ├── services/ (pesapal.ts, sms.ts)
    │   └── ...
    └── README.md
```

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
# → http://localhost:4000
```

**Demo accounts**
| Role     | Phone        | Password |
|----------|--------------|----------|
| Admin    | 255700000001 | admin123 |
| Customer | 255712345678 | demo123  |

### 2. Frontend

Open `index.html` with a local server (or just open the files).  
Set API URL if needed: `localStorage.setItem('niffer_api_url', 'http://localhost:4000/api')`

```bash
# From project root
npx serve .
# or python3 -m http.server 3000
```

### 3. Admin Panel

Open `admin.html` → login with admin credentials.

## Features Delivered

- ✅ Bilingual UI (EN / SW)
- ✅ Product catalog + filters
- ✅ Cart + Checkout
- ✅ Phone auth (JWT)
- ✅ Referral codes + 10% commission
- ✅ Pesapal API 3.0 (sandbox ready)
- ✅ SMS via Africa’s Talking (stub → live)
- ✅ Admin dashboard (orders, inventory, revenue)
- ✅ Image upload (base64 → local `/uploads`)
- ✅ Free shipping logic (Dar vs upcountry)

## Pesapal Sandbox Setup

1. Go to https://developer.pesapal.com
2. Create app → get **Consumer Key** & **Secret**
3. Put them in `backend/.env`
4. Register IPN: `POST /api/URLSetup/RegisterIPN` (or use dashboard)
5. Set `PESAPAL_IPN_ID` in `.env`
6. Test with sandbox numbers from Pesapal docs

## SMS (Africa’s Talking)

```bash
cd backend
npm install africastalking
```

Set in `.env`:
```
AT_USERNAME=sandbox
AT_API_KEY=your_key
AT_SENDER_ID=NIFFER
```

## Production Checklist

- [ ] Switch Prisma to PostgreSQL
- [ ] Real Pesapal live keys
- [ ] HTTPS + registered IPN
- [ ] Africa’s Talking production account + Sender ID (TCRA)
- [ ] Cloud storage for images (Cloudinary / S3)
- [ ] Rate limiting & monitoring
- [ ] Backup strategy

---

**Niffer Cosmetics** — Glow Naturally ✨  
Sinza • Dodoma • Nationwide Delivery
