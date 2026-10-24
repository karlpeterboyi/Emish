import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import * as pesapal from '../services/pesapal.js';
import { sendPaymentSuccess, sendOrderConfirmation, sendBookingPaid } from '../services/sms.js';
import { notifyBookingPaid, notifyAdminBooking } from '../services/whatsapp.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/payments/initiate
router.post('/initiate', async (req, res, next) => {
  try {
    const { orderNumber } = z.object({ orderNumber: z.string() }).parse(req.body);

    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new AppError('Order not found', 404);
    if (order.paymentStatus === 'COMPLETED') throw new AppError('Order already paid', 400);

    if (!pesapal.isPesapalConfigured()) {
      const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
      return res.json({
        success: true,
        demo: true,
        message: 'Pesapal sandbox page (keys not set). Add PESAPAL_CONSUMER_KEY/SECRET for real Pesapal.',
        data: {
          order_tracking_id: 'DEMO-' + order.orderNumber,
          redirect_url: `${appUrl}/pesapal-pay.html?order=${encodeURIComponent(order.orderNumber)}&amount=${order.total}`,
          merchant_reference: order.orderNumber,
          amount: order.total,
        },
      });
    }

    const notificationId = process.env.PESAPAL_IPN_ID || '';
    if (!notificationId) {
      throw new AppError(
        'PESAPAL_IPN_ID missing. Run: npm run pesapal:register-ipn (after setting PESAPAL_IPN_URL)',
        400
      );
    }

    const nameParts = order.customerName.trim().split(/\s+/);
    const result = await pesapal.submitOrder({
      id: order.orderNumber,
      currency: 'TZS',
      amount: order.total,
      description: `Emish Beauty Spa Order ${order.orderNumber}`.slice(0, 100),
      callback_url:
        process.env.PESAPAL_CALLBACK_URL ||
        `${process.env.APP_URL || 'http://localhost:3000'}/payment-callback.html`,
      notification_id: notificationId,
      billing_address: {
        email_address: order.customerEmail || undefined,
        phone_number: order.customerPhone.startsWith('+')
          ? order.customerPhone
          : order.customerPhone.startsWith('255')
            ? `+${order.customerPhone}`
            : `+255${order.customerPhone.replace(/^0/, '')}`,
        country_code: 'TZ',
        first_name: nameParts[0] || 'Customer',
        last_name: nameParts.slice(1).join(' ') || nameParts[0] || 'Customer',
        line_1: order.shippingAddress,
        city: order.shippingCity,
        state: order.shippingRegion || undefined,
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


async function markBookingPaid(bookingId: string) {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: 'COMPLETED',
      status: 'CONFIRMED',
    },
    include: { service: true },
  });

  await prisma.commission.updateMany({
    where: { bookingId, status: 'PENDING' },
    data: { status: 'APPROVED' },
  });

  const when = booking.scheduledAt.toLocaleString('en-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
  const serviceName = booking.service?.nameEn || 'Service';

  await notifyBookingPaid({
    phone: booking.customerPhone,
    bookingNumber: booking.bookingNumber,
    serviceName,
    when,
    amount: booking.price,
    durationMinutes: booking.durationMinutes,
  }).catch(() => {});

  await notifyAdminBooking({
    bookingNumber: booking.bookingNumber,
    serviceName,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    when,
    amount: booking.price,
  }).catch(() => {});

  await sendBookingPaid(
    booking.customerPhone,
    booking.bookingNumber,
    serviceName,
    when,
    booking.price
  ).catch(() => {});

  return booking;
}

async function markOrderPaid(orderId: string, orderNumber: string, phone: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: 'COMPLETED',
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  // Approve pending commissions for this order
  await prisma.commission.updateMany({
    where: { orderId, status: 'PENDING' },
    data: { status: 'APPROVED' },
  });

  await sendPaymentSuccess(phone, orderNumber).catch(() => {});
  await sendOrderConfirmation(phone, orderNumber, order.total).catch(() => {});
  return order;
}

// POST /api/payments/ipn — Pesapal webhook (must be public HTTPS in production)
router.post('/ipn', async (req, res) => {
  try {
    const trackingId =
      req.body?.OrderTrackingId ||
      req.body?.orderTrackingId ||
      req.query?.OrderTrackingId ||
      req.query?.orderTrackingId;

    if (!trackingId) {
      return res.status(400).json({ error: 'Missing OrderTrackingId' });
    }

    const status = await pesapal.getTransactionStatus(String(trackingId));
    const desc = (status.payment_status_description || '').toUpperCase();

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { pesapalTrackingId: String(trackingId) },
          { orderNumber: status.merchant_reference || undefined },
        ],
      },
    });

    if (order && (desc === 'COMPLETED' || desc === 'PAID' || status.status_code === 1)) {
      if (order.paymentStatus !== 'COMPLETED') {
        await markOrderPaid(order.id, order.orderNumber, order.customerPhone);
      }
    } else if (order && (desc === 'FAILED' || desc === 'INVALID')) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      });
    }

    // Pesapal expects 200
    res.json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: trackingId,
      status: 200,
    });
  } catch (err: any) {
    console.error('[IPN]', err?.message || err);
    res.status(200).json({ status: 200 }); // still 200 so Pesapal does not retry forever aggressively
  }
});

// GET IPN (some Pesapal setups use GET)
router.get('/ipn', async (req, res) => {
  req.body = { OrderTrackingId: req.query.OrderTrackingId || req.query.orderTrackingId };
  return (router as any).handle(
    { ...req, method: 'POST', url: '/ipn' } as any,
    res,
    () => {}
  );
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

    // Optionally refresh from Pesapal if still pending
    if (order.pesapalTrackingId && order.paymentStatus === 'PENDING' && pesapal.isPesapalConfigured()) {
      try {
        const st = await pesapal.getTransactionStatus(order.pesapalTrackingId);
        const desc = (st.payment_status_description || '').toUpperCase();
        if (desc === 'COMPLETED' || st.status_code === 1) {
          const full = await prisma.order.findUnique({ where: { orderNumber: order.orderNumber } });
          if (full) {
            await markOrderPaid(full.id, full.orderNumber, full.customerPhone);
            order.paymentStatus = 'COMPLETED';
            order.status = 'PAID';
          }
        }
      } catch {
        /* ignore */
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// Demo: mark paid without Pesapal (local testing only)
router.post('/demo-complete', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Not available in production', 403);
    }
    const body = z
      .object({
        orderNumber: z.string().optional(),
        bookingNumber: z.string().optional(),
      })
      .parse(req.body);

    if (body.bookingNumber) {
      const booking = await prisma.booking.findUnique({ where: { bookingNumber: body.bookingNumber } });
      if (!booking) throw new AppError('Booking not found', 404);
      await markBookingPaid(booking.id);
      return res.json({ success: true, message: 'Booking marked paid (demo)', type: 'booking' });
    }

    if (body.orderNumber) {
      const order = await prisma.order.findUnique({ where: { orderNumber: body.orderNumber } });
      if (!order) throw new AppError('Order not found', 404);
      await markOrderPaid(order.id, order.orderNumber, order.customerPhone);
      return res.json({ success: true, message: 'Order marked paid (demo)', type: 'order' });
    }

    throw new AppError('orderNumber or bookingNumber required', 400);
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/initiate-booking
router.post('/initiate-booking', async (req, res, next) => {
  try {
    const { bookingNumber } = z.object({ bookingNumber: z.string() }).parse(req.body);
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: { service: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.paymentStatus === 'COMPLETED') throw new AppError('Booking already paid', 400);

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    if (!pesapal.isPesapalConfigured()) {
      return res.json({
        success: true,
        demo: true,
        message: 'Pesapal sandbox (keys not set)',
        data: {
          order_tracking_id: 'DEMO-' + booking.bookingNumber,
          redirect_url: `${appUrl}/pesapal-pay.html?booking=${encodeURIComponent(booking.bookingNumber)}&amount=${booking.price}&type=booking`,
          merchant_reference: booking.bookingNumber,
          amount: booking.price,
        },
      });
    }

    const notificationId = process.env.PESAPAL_IPN_ID || '';
    if (!notificationId) {
      throw new AppError('PESAPAL_IPN_ID missing', 400);
    }

    const nameParts = booking.customerName.trim().split(/\s+/);
    const result = await pesapal.submitOrder({
      id: booking.bookingNumber,
      currency: 'TZS',
      amount: booking.price,
      description: `Emish booking ${booking.bookingNumber} - ${booking.service?.nameEn || 'Service'}`.slice(0, 100),
      callback_url:
        process.env.PESAPAL_CALLBACK_URL ||
        `${appUrl}/payment-callback.html?booking=${encodeURIComponent(booking.bookingNumber)}`,
      notification_id: notificationId,
      billing_address: {
        email_address: booking.customerEmail || undefined,
        phone_number: booking.customerPhone.startsWith('+')
          ? booking.customerPhone
          : booking.customerPhone.startsWith('255')
            ? `+${booking.customerPhone}`
            : `+255${booking.customerPhone.replace(/^0/, '')}`,
        country_code: 'TZ',
        first_name: nameParts[0] || 'Customer',
        last_name: nameParts.slice(1).join(' ') || nameParts[0] || 'Customer',
        line_1: 'Emish Beauty Spa',
        city: 'Dar es Salaam',
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

// GET payment status for booking
router.get('/booking-status/:bookingNumber', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber: req.params.bookingNumber },
      include: { service: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    res.json({
      success: true,
      data: {
        bookingNumber: booking.bookingNumber,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        price: booking.price,
        scheduledAt: booking.scheduledAt,
        service: booking.service?.nameEn,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /payment/callback or /api/payments/callback
// Route called by Pesapal redirect after customer completes or cancels payment
router.get('/callback', async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference } = req.query;

  console.log(`[Pesapal Callback] Tracking ID: ${OrderTrackingId}, Merchant Ref: ${OrderMerchantReference}`);

  // Send a friendly success HTML page back to the mobile browser
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - Emish Beauty Spa</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px 20px; background-color: #f9fafb; margin: 0; }
        .card { background: white; padding: 32px 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); max-width: 380px; margin: 40px auto; }
        .icon-circle { width: 64px; height: 64px; background: #e6f4ea; color: #1e8e3e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px auto; font-weight: bold; }
        h2 { color: #111827; margin: 0 0 8px 0; font-size: 22px; }
        p { color: #4b5563; font-size: 14px; line-height: 1.5; margin: 8px 0; }
        .ref-box { background: #f3f4f6; border-radius: 8px; padding: 10px; font-weight: 600; color: #1f2937; margin: 16px 0; font-size: 13px; word-break: break-all; }
        .btn { display: block; width: 100%; box-sizing: border-box; margin-top: 24px; padding: 14px 20px; background: #25D366; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-circle">✓</div>
        <h2>Payment Processed!</h2>
        <p>Thank you for your payment to <strong>Emish Beauty Spa</strong>.</p>
        <div class="ref-box">Order Ref: ${OrderMerchantReference || 'N/A'}</div>
        <p>Your order status is being updated automatically on WhatsApp.</p>
        <a href="https://wa.me/255791868956" class="btn">Return to WhatsApp Chat</a>
      </div>
    </body>
    </html>
  `);
});


export default router;
