import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateReferralCode } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9).max(15),
  password: z.string().min(4),
  email: z.string().email().optional(),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(1),
});

function signToken(user: { id: string; phone: string; role: string }) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET || 'fallback',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Normalize phone
    let phone = data.phone.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '255' + phone.slice(1);
    if (!phone.startsWith('255')) phone = '255' + phone;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw new AppError('Phone number already registered', 409);

    let referredById: string | undefined;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: data.referralCode.toUpperCase() } });
      if (referrer) referredById = referrer.id;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const referralCode = generateReferralCode(data.name);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        phone,
        email: data.email,
        passwordHash,
        referralCode,
        referredById,
      },
      select: { id: true, name: true, phone: true, email: true, referralCode: true, role: true },
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    
    let phone = data.phone.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '255' + phone.slice(1);
    if (!phone.startsWith('255')) phone = '255' + phone;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.passwordHash) throw new AppError('Invalid phone or password', 401);

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid phone or password', 401);

    if (!user.isActive) throw new AppError('Account is disabled', 403);

    const token = signToken(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          referralCode: user.referralCode,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, phone: true, email: true,
        referralCode: true, role: true, createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
