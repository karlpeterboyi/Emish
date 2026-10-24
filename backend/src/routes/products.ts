import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// GET /api/products - list with filters
router.get('/', async (req, res, next) => {
  try {
    const { category, search, featured, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { isActive: true };
    if (category && category !== 'all') {
      where.category = { slug: String(category) };
    }
    if (featured === 'true') where.isFeatured = true;
    if (search) {
      where.OR = [
        { nameEn: { contains: String(search) } },
        { nameSw: { contains: String(search) } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { slug: true, nameEn: true, nameSw: true } } },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/meta/categories  (must be before :slug)
router.get('/meta/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slugOrId — by slug or id
router.get('/:slugOrId', async (req, res, next) => {
  try {
    const key = String(req.params.slugOrId || '').trim();
    if (!key) throw new AppError('Product not found', 404);

    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: key }, { id: key }],
      },
      include: { category: true },
    });

    if (!product) throw new AppError('Product not found', 404);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// ADMIN: Create product
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      nameEn: z.string(),
      nameSw: z.string(),
      slug: z.string(),
      descriptionEn: z.string(),
      descriptionSw: z.string(),
      price: z.number().int().positive(),
      compareAtPrice: z.number().int().optional(),
      stock: z.number().int().min(0),
      categoryId: z.string(),
      images: z.array(z.string()).optional(),
      badge: z.string().optional(),
      isFeatured: z.boolean().optional(),
      howToUseEn: z.string().optional(),
      howToUseSw: z.string().optional(),
      ingredients: z.string().optional(),
    });
    const data = schema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        ...data,
        images: JSON.stringify(data.images || []),
      },
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// ADMIN: Update stock
router.patch('/:id/stock', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { stock } = z.object({ stock: z.number().int().min(0) }).parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock },
    });
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});



// PATCH /api/products/:id — full update
router.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'].includes(req.user!.role)) {
      throw new AppError('Not allowed', 403);
    }
    const data = z.object({
      nameEn: z.string().optional(),
      nameSw: z.string().optional(),
      descriptionEn: z.string().optional(),
      descriptionSw: z.string().optional(),
      price: z.number().int().positive().optional(),
      compareAtPrice: z.number().int().optional().nullable(),
      stock: z.number().int().optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      images: z.array(z.string()).optional(),
      categoryId: z.string().optional(),
    }).parse(req.body);
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id — soft delete
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(req.user!.role)) {
      throw new AppError('Only managers can delete products', 403);
    }
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
