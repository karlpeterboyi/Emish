import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import * as pesapal from '../services/pesapal.js';
import { sendPaymentSuccess, sendOrderConfirmation } from '../services/sms.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/payments/initiate - start Pesapal payment for an order
router.post('/initiate', async (req, res, next) => {
  try {
    const { orderNumber } = z.object({ orderNumber: z.string() }).parse(req.body);

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new AppError('Order not found', 404);
    if (order.paymentStatus === 'COMPLETED') throw new AppError('Order already paid', 400);

    // In production: ensure IPN is registered once and store the notification_id
    // For now we use env or a placeholder - you must register IPN first via Pesapal dashboard or API
    const notificationId = process.env.PESAPAL_IPN_ID || '';

    if (!process.env.PESAPAL_CONSUMER_KEY || process.env.PESAPAL_CONSUMER_KEY.includes('your_')) {
      // Demo mode - return mock redirect
      return res.json({
        success: true,
        demo: true,
        message: 'Pesapal credentials not set - demo mode. Set PESAPAL_* env vars for real payments.',
        data: {
          order_tracking_id: 'DEMO-' + order.orderNumber,
          redirect_url: `${process.env.APP_URL}/payment/callback?order=${order.orderNumber}&status=demo`,
          merchant_reference: order.orderNumber,
        },
      });
    }

    const nameParts = order.customerName.split(' ');
    const result = await pesapal.submitOrder({
      id: order.orderNumber,
      currency: 'TZS',
      amount: order.total,
      description: `Niffer Cosmetics Order ${order.orderNumber}`,
      callback_url: process.env.PESAPAL_CALLBACK_URL || `${process.env.APP_URL}/payment/callback`,
      notification_id: notificationId,
      billing_address: {
        email_address: order.customerEmail || undefined,
        phone_number: order.customerPhone,
        country_code: 'TZ',
        first_name: nameParts[0] || order.customerName,
        last_name: nameParts.slice(1).join(' ') || '',
        line_1: order.shippingAddress,
        city: order.shippingCity,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        pesapalTrackingId: result.order_tracking_id,
        pesapalMerchantRef: result.merchant_reference,
      },
    });

    res.json({
      success: true,
      data: {
        order_tracking_id: result.order_tracking_id,
        redirect_url: result.redirect_url,
        merchant_reference: result.merchant_reference,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/ipn - Pesapal Instant Payment Notification
router.post('/ipn', async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.body;

    if (!OrderTrackingId) {
      return res.status(400).json({ error: 'Missing tracking id' });
    }

    const status = await pesapal.getTransactionStatus(OrderTrackingId);
    // status.payment_status_description: COMPLETED | PENDING | FAILED | INVALID etc.

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { pesapalTrackingId: OrderTrackingId },
          { orderNumber: OrderMerchantReference },
        ],
      },
    });

    if (order && status.payment_status_description === 'COMPLETED') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await sendPaymentSuccess(order.customerPhone, order.orderNumber);
      // await sendOrderConfirmation(...);
      // TODO: approve commission if any
    }

    // Pesapal expects 200
    res.json({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, status: 200 });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/status/:orderNumber
router.get('/status/:orderNumber', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber: true,
        paymentStatus: true,
        status: true,
        total: true,
        paidAt: true,
        pesapalTrackingId: true,
      },
    });
    if (!order) throw new AppError('Order not found', 404);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

export default router;
