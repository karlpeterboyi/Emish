import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [ordersCount, productsCount, usersCount, revenue] = await Promise.all([
      prisma.order.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { total: true },
      }),
    ]);

    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const lowStock = await prisma.product.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      select: { id: true, nameEn: true, stock: true, sku: true },
    });

    res.json({
      success: true,
      data: {
        stats: {
          orders: ordersCount,
          products: productsCount,
          customers: usersCount,
          revenue: revenue._sum.total || 0,
        },
        recentOrders,
        lowStock,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders
router.get('/orders', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.status = String(status);

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products (all including inactive)
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

export default router;
