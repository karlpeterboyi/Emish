import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import referralRoutes from './routes/referrals.js';
import adminRoutes from './routes/admin.js';
import whatsappRoutes from './routes/whatsapp.js';
import uploadRoutes from './routes/uploads.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(morgan(isProd ? 'combined' : 'dev'));

// CORS – allow storefront origin(s)
const allowedOrigins = (process.env.APP_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());
app.use(cors({
  origin: true, // allow all origins in local/dev; tighten APP_URL list in production if needed
  credentials: true,
}));

app.use(express.json({ limit: '5mb' })); // images via base64
app.use(express.urlencoded({ extended: true }));

// Rate limits
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 100,
  message: { success: false, error: 'Too many attempts. Try again later.' },
});
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Emish Beauty Spa API',
    version: '1.1.0',
    env: process.env.NODE_ENV || 'development',
    pesapal: process.env.PESAPAL_ENV || 'sandbox',
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/uploads', express.static('uploads'));

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-me')) {
      console.warn('⚠️  JWT_SECRET is weak or default — set a strong secret before production');
    }
    if (!process.env.PESAPAL_CONSUMER_KEY || process.env.PESAPAL_CONSUMER_KEY.includes('your_')) {
      console.warn('⚠️  Pesapal keys not set — payment runs in DEMO mode');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Emish Beauty Spa API  v1.1.0`);
      console.log(`   URL:  http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Env: ${process.env.NODE_ENV || 'development'} | Pesapal: ${process.env.PESAPAL_ENV || 'sandbox'}\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

main();

export { prisma };
