import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const { category, featured } = req.query;
    const where: any = { isActive: true };
    if (category && category !== 'all') where.category = { slug: String(category) };
    if (featured === 'true') where.isFeatured = true;

    const services = await prisma.service.findMany({
      where,
      include: { category: { select: { slug: true, nameEn: true, nameSw: true } } },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    });
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
});

router.get('/meta/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.get('/:slugOrId', async (req, res, next) => {
  try {
    const key = String(req.params.slugOrId).trim();
    const service = await prisma.service.findFirst({
      where: { isActive: true, OR: [{ slug: key }, { id: key }] },
      include: { category: true },
    });
    if (!service) throw new AppError('Service not found', 404);
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      nameEn: z.string(),
      nameSw: z.string(),
      slug: z.string(),
      descriptionEn: z.string(),
      descriptionSw: z.string(),
      durationMinutes: z.number().int().positive(),
      price: z.number().int().positive(),
      categoryId: z.string(),
      imageUrl: z.string().optional(),
      isFeatured: z.boolean().optional(),
    }).parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});



router.patch('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      nameEn: z.string().optional(),
      nameSw: z.string().optional(),
      descriptionEn: z.string().optional(),
      descriptionSw: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      price: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      categoryId: z.string().optional(),
    }).parse(req.body);
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    if (!['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(req.user!.role)) {
      throw new AppError('Only managers can delete services', 403);
    }
    await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
