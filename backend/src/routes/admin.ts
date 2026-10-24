import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

async function getSetting(key: string, fallback: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

async function setSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Dashboard
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [products, services, bookings, orders, revenue, pendingCommissions] = await Promise.all([
      prisma.product.count(),
      prisma.service.count().catch(() => 0),
      prisma.booking.count().catch(() => 0),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { total: true },
      }),
      prisma.commission.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
    ]);
    res.json({
      success: true,
      data: {
        products,
        services,
        bookings,
        orders,
        revenue: revenue._sum.total || 0,
        pendingCommissions: pendingCommissions._sum.amount || 0,
        commissionRateProducts: Number(await getSetting('commission_rate_products', '0.05')),
        commissionRateServices: Number(await getSetting('commission_rate_services', '0.05')),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Settings — commission rates etc.
router.get('/settings', async (_req, res, next) => {
  try {
    const keys = [
      'commission_rate_products',
      'commission_rate_services',
      'free_shipping_threshold',
      'shipping_dar',
      'shipping_upcountry',
    ];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {
      commission_rate_products: '0.05',
      commission_rate_services: '0.05',
      free_shipping_threshold: '50000',
      shipping_dar: '3000',
      shipping_upcountry: '8000',
    };
    rows.forEach((r) => { map[r.key] = r.value; });
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const body = z.record(z.string()).parse(req.body);
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, String(value));
    }
    res.json({ success: true, data: body });
  } catch (err) {
    next(err);
  }
});

// Orders
router.get('/orders', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const status = z.string().parse(req.body.status);
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: status as any },
    });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// Products (admin list all including inactive)
router.get('/products', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const data = z.object({
      nameEn: z.string().optional(),
      nameSw: z.string().optional(),
      price: z.number().int().optional(),
      stock: z.number().int().optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      descriptionEn: z.string().optional(),
      descriptionSw: z.string().optional(),
    }).parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Services admin
router.get('/services', async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

router.patch('/services/:id', async (req, res, next) => {
  try {
    const data = z.object({
      nameEn: z.string().optional(),
      nameSw: z.string().optional(),
      price: z.number().int().optional(),
      durationMinutes: z.number().int().optional(),
      isActive: z.boolean().optional(),
      descriptionEn: z.string().optional(),
    }).parse(req.body);
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

router.delete('/services/:id', async (req, res, next) => {
  try {
    await prisma.service.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Commissions admin
router.get('/commissions', async (_req, res, next) => {
  try {
    const list = await prisma.commission.findMany({
      include: {
        user: { select: { name: true, phone: true, referralCode: true } },
        order: { select: { orderNumber: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.patch('/commissions/:id', async (req, res, next) => {
  try {
    const status = z.enum(['PENDING', 'APPROVED', 'PAID']).parse(req.body.status);
    const row = await prisma.commission.update({
      where: { id: req.params.id },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

// Categories for product create
router.get('/categories', async (_req, res, next) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: cats });
  } catch (err) {
    next(err);
  }
});

router.get('/service-categories', async (_req, res, next) => {
  try {
    const cats = await prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: cats });
  } catch (err) {
    next(err);
  }
});

export default router;
