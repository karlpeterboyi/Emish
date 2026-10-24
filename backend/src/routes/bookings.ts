import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { sendSMS } from '../services/sms.js';

const router = Router();
const prisma = new PrismaClient();

/** Emish hours: Mon–Sat 9–20, Sun 10–20 (Africa/Dar_es_Salaam wall clock stored as local Date) */
const OPEN_WEEKDAY = 9;
const OPEN_SUNDAY = 10;
const CLOSE_HOUR = 20;

function bookingNumber() {
  const d = new Date();
  const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EB-${stamp}-${rand}`;
}

function parseDayBounds(dateStr: string) {
  // dateStr YYYY-MM-DD interpreted as Dar local calendar day
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end, y, m, d };
}

function generateCandidateSlots(dateStr: string, durationMinutes: number): Date[] {
  const { y, m, d } = parseDayBounds(dateStr);
  const day = new Date(y, m - 1, d).getDay(); // 0 Sun
  const openH = day === 0 ? OPEN_SUNDAY : OPEN_WEEKDAY;
  const slots: Date[] = [];
  const step = 30; // show slots every 30 minutes
  for (let mins = openH * 60; mins + durationMinutes <= CLOSE_HOUR * 60; mins += step) {
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    slots.push(new Date(y, m - 1, d, hh, mm, 0, 0));
  }
  return slots;
}

function overlaps(aStart: Date, aDur: number, bStart: Date, bDur: number) {
  const aEnd = aStart.getTime() + aDur * 60_000;
  const bEnd = bStart.getTime() + bDur * 60_000;
  return aStart.getTime() < bEnd && bStart.getTime() < aEnd;
}

// GET /api/bookings/slots?date=YYYY-MM-DD&serviceSlug=...|&serviceId=...
router.get('/slots', async (req, res, next) => {
  try {
    const date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('date required as YYYY-MM-DD', 400);
    }

    let service = null as any;
    if (req.query.serviceId) {
      service = await prisma.service.findFirst({
        where: { id: String(req.query.serviceId), isActive: true },
      });
    } else if (req.query.serviceSlug) {
      service = await prisma.service.findFirst({
        where: { slug: String(req.query.serviceSlug), isActive: true },
      });
    }
    if (!service) throw new AppError('Service not found', 404);

    const duration = service.durationMinutes || 60;
    const { start, end } = parseDayBounds(date);

    const existing = await prisma.booking.findMany({
      where: {
        serviceId: service.id,
        scheduledAt: { gte: start, lte: end },
        status: { in: ['PENDING', 'CONFIRMED'] },
        paymentStatus: { in: ['PENDING', 'COMPLETED'] },
      },
    });

    const now = Date.now() + 30 * 60_000; // need 30 min lead time
    const candidates = generateCandidateSlots(date, duration);
    const available = candidates
      .filter((slot) => slot.getTime() >= now)
      .filter(
        (slot) =>
          !existing.some((b) =>
            overlaps(slot, duration, b.scheduledAt, b.durationMinutes || duration)
          )
      )
      .map((slot) => {
        const hh = String(slot.getHours()).padStart(2, '0');
        const mm = String(slot.getMinutes()).padStart(2, '0');
        return {
          time: `${hh}:${mm}`,
          iso: slot.toISOString(),
          label: `${hh}:${mm}`,
        };
      });

    res.json({
      success: true,
      data: {
        date,
        service: {
          id: service.id,
          slug: service.slug,
          nameEn: service.nameEn,
          durationMinutes: duration,
          price: service.price,
        },
        slots: available,
        openHours: { open: date.endsWith('') ? undefined : undefined, close: CLOSE_HOUR },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public: create booking (payment still pending)
router.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        serviceId: z.string().optional(),
        serviceSlug: z.string().optional(),
        customerName: z.string().min(2),
        customerPhone: z.string().min(9),
        customerEmail: z.string().email().optional().or(z.literal('')),
        scheduledAt: z.string(),
        notes: z.string().optional(),
        referralCode: z.string().optional(),
        paymentMethod: z.string().optional(),
      })
      .parse(req.body);

    let service = null as any;
    if (body.serviceId) {
      service = await prisma.service.findFirst({ where: { id: body.serviceId, isActive: true } });
    } else if (body.serviceSlug) {
      service = await prisma.service.findFirst({ where: { slug: body.serviceSlug, isActive: true } });
    }
    if (!service) throw new AppError('Service not found', 404);

    const scheduledAt = new Date(body.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 15 * 60_000) {
      throw new AppError('Please choose a valid future slot (at least 15 minutes ahead)', 400);
    }

    const duration = service.durationMinutes || 60;
    const clash = await prisma.booking.findFirst({
      where: {
        serviceId: service.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    // Check overlap properly
    const dayStart = new Date(scheduledAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledAt);
    dayEnd.setHours(23, 59, 59, 999);
    const dayBookings = await prisma.booking.findMany({
      where: {
        serviceId: service.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
    });
    if (
      dayBookings.some((b) =>
        overlaps(scheduledAt, duration, b.scheduledAt, b.durationMinutes || duration)
      )
    ) {
      throw new AppError('That time slot is no longer available. Please pick another.', 409);
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: bookingNumber(),
        serviceId: service.id,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        scheduledAt,
        durationMinutes: duration,
        price: service.price,
        notes: body.notes || null,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
      include: { service: true },
    });

    if (body.referralCode) {
      try {
        const referrer = await prisma.user.findFirst({
          where: { referralCode: body.referralCode.toUpperCase() },
        });
        if (referrer) {
          const rateRow = await prisma.setting.findUnique({
            where: { key: 'commission_rate_services' },
          });
          const rate = Number(rateRow?.value || process.env.COMMISSION_RATE || 0.05);
          const amount = Math.round(service.price * rate);
          await prisma.commission.create({
            data: {
              userId: referrer.id,
              bookingId: booking.id,
              source: 'SERVICE',
              amount,
              rate,
              status: 'PENDING',
            },
          });
        }
      } catch (e) {
        console.warn('service commission skipped', e);
      }
    }

    // Do not confirm by SMS until paid — optional reminder
    const when = scheduledAt.toLocaleString('en-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
    await sendSMS(
      body.customerPhone,
      `Emish Beauty Spa: Booking ${booking.bookingNumber} held for ${service.nameEn} on ${when}. Complete payment to confirm.`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        price: booking.price,
        scheduledAt: booking.scheduledAt,
        service: {
          nameEn: service.nameEn,
          durationMinutes: duration,
        },
        paymentStatus: booking.paymentStatus,
        status: booking.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public: get booking by number
router.get('/ref/:bookingNumber', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber: req.params.bookingNumber },
      include: { service: true },
    });
    if (!booking) throw new AppError('Booking not found', 404);
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// Admin list
router.get('/', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const list = await prisma.booking.findMany({
      include: { service: true },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const status = z
      .enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
      .parse(req.body.status);
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      include: { service: true },
    });
    await sendSMS(
      booking.customerPhone,
      `Emish Beauty Spa: Booking ${booking.bookingNumber} is now ${status}.`
    ).catch(() => {});
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

export default router;
