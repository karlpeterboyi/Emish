import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/referrals/dashboard
router.get('/dashboard', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { referralCode: true, name: true },
    });
    if (!user) throw new AppError('User not found', 404);

    const commissions = await prisma.commission.findMany({
      where: { userId: req.user!.id },
      include: {
        order: {
          select: { orderNumber: true, customerName: true, total: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarned = commissions.reduce((s, c) => s + c.amount, 0);
    const pending = commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0);
    const paid = commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amount, 0);

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        stats: {
          totalReferrals: commissions.length,
          totalEarned,
          pending,
          paid,
          commissionRate: Number(process.env.COMMISSION_RATE || 0.10),
        },
        commissions,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
