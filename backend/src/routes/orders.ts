import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateOrderNumber, calculateShipping } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  customerName: z.string().min(2),
  customerPhone: z.string().min(9),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.string().min(5),
  shippingCity: z.string().min(2),
  shippingRegion: z.string().optional(),
  notes: z.string().optional(),
  referralCode: z.string().optional(),
  paymentMethod: z.enum(['MPESA', 'TIGO', 'AIRTEL', 'CARD']).optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const userId = (req as AuthRequest).user?.id;

    const productIds = data.items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found', 400);
    }

    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.nameEn}`, 400);
      }
      const totalPrice = product.price * item.quantity;
      subtotal += totalPrice;
      orderItemsData.push({
        productId: product.id,
        productName: product.nameEn,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice,
      });
    }

    const shippingFee = calculateShipping(subtotal, data.shippingCity);
    let discount = 0;
    let referrerId: string | null = null;

    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode.toUpperCase() },
      });
      if (referrer) {
        discount = Math.round(subtotal * 0.05);
        referrerId = referrer.id;
      }
    }

    const total = subtotal + shippingFee - discount;
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity,
          shippingRegion: data.shippingRegion,
          notes: data.notes,
          subtotal,
          shippingFee,
          discount,
          total,
          referralCodeUsed: data.referralCode?.toUpperCase(),
          paymentMethod: data.paymentMethod,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (referrerId) {
        const commissionAmount = Math.round(subtotal * Number(process.env.COMMISSION_RATE || 0.10));
        await tx.commission.create({
          data: {
            userId: referrerId,
            orderId: newOrder.id,
            amount: commissionAmount,
            rate: Number(process.env.COMMISSION_RATE || 0.10),
            status: 'PENDING',
          },
        });
      }

      return newOrder;
    });

    res.status(201).json({
      success: true,
      message: 'Order created. Proceed to payment.',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/my', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

router.get('/:orderNumber', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: { items: true },
    });
    if (!order) throw new AppError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

export default router;
