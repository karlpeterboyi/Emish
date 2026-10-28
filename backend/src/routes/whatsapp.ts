/**
 * WhatsApp ordering / booking bot (Meta Cloud API)
 *
 * Webhook verify: GET  /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 * Incoming:       POST /api/whatsapp/webhook
 *
 * User flows (text):
 *   HI / MENU / START  → main menu
 *   1 / SHOP           → product list
 *   2 / BOOK           → service list
 *   ORDER <slug>       → start product order (asks phone/address)
 *   BOOK <slug>        → start booking (asks date)
 *   PAY <ref>          → payment link for order/booking
 *   STATUS <ref>       → status check
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendWhatsApp, isWhatsAppConfigured } from '../services/whatsapp.js';

const router = Router();
const prisma = new PrismaClient();

// Simple in-memory session (use Redis in production multi-instance)
const sessions = new Map<string, { step: string; data: Record<string, any> }>();

function getSession(phone: string) {
  if (!sessions.has(phone)) sessions.set(phone, { step: 'idle', data: {} });
  return sessions.get(phone)!;
}

async function reply(to: string, text: string) {
  await sendWhatsApp(to, text);
}

const MENU =
  `*Emish Beauty Spa* ✨\n` +
  `Karibu! Choose:\n\n` +
  `*1* — Shop products\n` +
  `*2* — Book a service\n` +
  `*3* — My order / booking status\n` +
  `*4* — Talk to us (human)\n\n` +
  `Or type:\n` +
  `ORDER <product-slug>\n` +
  `BOOK <service-slug>\n` +
  `PAY <order-or-booking-ref>\n\n` +
  `Dar · Arusha · Dodoma\n0672 283 434`;

// Meta webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verify = process.env.WHATSAPP_VERIFY_TOKEN || 'emish_verify';
  if (mode === 'subscribe' && token === verify) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // ack fast — Meta requires quick 200
  try {
    console.log('[WhatsApp] webhook POST', JSON.stringify(req.body)?.slice(0, 800));

    if (!isWhatsAppConfigured()) {
      console.warn('[WhatsApp] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID missing on server — cannot reply');
    }

    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const msg = value?.messages?.[0];
    if (!msg) {
      console.log('[WhatsApp] no messages[] in payload (status update?)');
      return;
    }

    const from = String(msg.from || ''); // 255...
    const text = (msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || '').trim();
    console.log('[WhatsApp] from=', from, 'text=', text);
    if (!from || !text) return;
    const upper = text.toUpperCase();
    const session = getSession(from);

    if (['HI', 'HELLO', 'HABARI', 'MENU', 'START', 'HELP', '0'].includes(upper)) {
      session.step = 'idle';
      await reply(from, MENU);
      return;
    }

    if (upper === '1' || upper === 'SHOP' || upper.startsWith('SHOP')) {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      const lines = products.map(
        (p, i) => `${i + 1}. *${p.nameEn}*\n   TZS ${p.price.toLocaleString()} — ORDER ${p.slug}`
      );
      await reply(
        from,
        `*Products*\n\n${lines.join('\n\n')}\n\nReply: ORDER <slug>\nExample: ORDER glow-serum-vitamin-c`
      );
      return;
    }

    if (upper === '2' || upper === 'BOOK' || upper === 'BOOKING') {
      const services = await prisma.service.findMany({
        where: { isActive: true },
        take: 10,
        orderBy: { sortOrder: 'asc' },
      });
      const lines = services.map(
        (s, i) =>
          `*${i + 1}.* *${s.nameEn}*\n  TZS ${s.price.toLocaleString()} · ${s.durationMinutes} min\n  BOOK ${s.slug}`
      );
      await reply(
        from,
        `*Services*\n\n${lines.join('\n\n')}\n\nReply with:\n• BOOK underarm-wax\n• BOOK Underarm Wax\n• BOOK 4\nThen we ask for your date.`
      );
      return;
    }

    if (upper === '3' || upper.startsWith('STATUS')) {
      const ref = text.split(/\s+/)[1];
      if (!ref) {
        await reply(from, 'Send: STATUS <order-or-booking-number>\nExample: STATUS NC-20261022-SWKI');
        return;
      }
      const order = await prisma.order.findUnique({ where: { orderNumber: ref.toUpperCase() } });
      if (order) {
        await reply(
          from,
          `Order *${order.orderNumber}*\nStatus: ${order.status}\nPayment: ${order.paymentStatus}\nTotal: TZS ${order.total.toLocaleString()}`
        );
        return;
      }
      const booking = await prisma.booking.findUnique({
        where: { bookingNumber: ref.toUpperCase() },
        include: { service: true },
      });
      if (booking) {
        const when = booking.scheduledAt.toLocaleString('en-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
        await reply(
          from,
          `Booking *${booking.bookingNumber}*\n${booking.service?.nameEn}\nWhen: ${when}\nStatus: ${booking.status}\nPayment: ${booking.paymentStatus}`
        );
        return;
      }
      await reply(from, 'Reference not found. Check the number and try again.');
      return;
    }

    if (upper === '4') {
      await reply(
        from,
        `A team member will assist you.\nCall/WhatsApp: 0672 283 434 or 0746 541 544\nBranches: Dar (Sinza) · Arusha · Dodoma`
      );
      return;
    }

    // ORDER <slug | name | list number>
    if (upper.startsWith('ORDER ')) {
      const rest = text.slice(6).trim();
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      });
      let product = null as (typeof products)[0] | null;
      const asNum = parseInt(rest, 10);
      if (String(asNum) === rest.trim() && asNum >= 1 && asNum <= products.length) {
        product = products[asNum - 1];
      }
      if (!product) {
        const slugTry = rest.toLowerCase().replace(/\s+/g, '-');
        product = products.find((x) => x.slug === slugTry) || null;
      }
      if (!product) {
        const q = rest.toLowerCase();
        product =
          products.find((x) => x.nameEn.toLowerCase() === q) ||
          products.find((x) => x.nameEn.toLowerCase().includes(q) || x.slug.includes(q.replace(/\s+/g, '-'))) ||
          null;
      }
      if (!product) {
        await reply(from, 'Product not found. Type *1* to see the list.\nTry: ORDER glow-serum-vitamin-c or ORDER 1');
        return;
      }
      session.step = 'order_qty';
      session.data = { productId: product.id, slug: product.slug, name: product.nameEn, price: product.price };
      await reply(
        from,
        `*${product.nameEn}*\nTZS ${product.price.toLocaleString()}\n\nHow many units? Reply with a number (e.g. 1).`
      );
      return;
    }

    if (session.step === 'order_qty') {
      const qty = parseInt(text, 10);
      if (!qty || qty < 1 || qty > 20) {
        await reply(from, 'Please send a quantity between 1 and 20.');
        return;
      }
      session.data.qty = qty;
      session.step = 'order_name';
      await reply(from, 'Your full name?');
      return;
    }

    if (session.step === 'order_name') {
      session.data.customerName = text;
      session.step = 'order_address';
      await reply(from, 'Delivery address (street, area, city)?');
      return;
    }

    if (session.step === 'order_address') {
      session.data.address = text;
      session.step = 'idle';
      const d = session.data;
      const total = d.price * d.qty;
      // Create order
      const orderNumber =
        'WA-' +
        new Date().toISOString().slice(0, 10).replace(/-/g, '') +
        '-' +
        Math.random().toString(36).slice(2, 6).toUpperCase();
      try {
        const order = await prisma.order.create({
          data: {
            orderNumber,
            customerName: d.customerName,
            customerPhone: from.startsWith('255') ? from : '255' + from.replace(/^0/, ''),
            shippingAddress: d.address,
            shippingCity: d.address.split(',').pop()?.trim() || 'Dar es Salaam',
            subtotal: total,
            shippingFee: total >= 50000 ? 0 : 3000,
            total: total + (total >= 50000 ? 0 : 3000),
            paymentMethod: 'OTHER',
            paymentStatus: 'PENDING',
            status: 'PENDING',
            items: {
              create: [
                {
                  productId: d.productId,
                  productName: d.name,
                  quantity: d.qty,
                  unitPrice: d.price,
                  totalPrice: d.price * d.qty,
                },
              ],
            },
          },
        });
        const appUrl = (process.env.APP_URL || 'https://emishbeautyspa.co.tz').replace(/\/$/, '');
        const payUrl = `${appUrl}/pay.html?order=${encodeURIComponent(order.orderNumber)}&amount=${order.total}`;
        await reply(
          from,
          `✅ Order *${order.orderNumber}* created\n` +
            `${d.name} x${d.qty}\n` +
            `Total: TZS ${order.total.toLocaleString()}\n\n` +
            `Pay here:\n${payUrl}\n\n` +
            `Or reply: PAY ${order.orderNumber}`
        );
      } catch (e: any) {
        console.error('WA order failed', e);
        await reply(from, 'Could not create order. Please try the website or call 0672 283 434.');
      }
      return;
    }

    // BOOK <slug | name | list number>
    if (upper.startsWith('BOOK ')) {
      const rest = text.slice(5).trim(); // after "BOOK "
      const services = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 30,
      });

      let service = null as (typeof services)[0] | null;

      // 1) numeric index from list (BOOK 1, BOOK 3)
      const asNum = parseInt(rest, 10);
      if (String(asNum) === rest.trim() && asNum >= 1 && asNum <= services.length) {
        service = services[asNum - 1];
      }

      // 2) exact slug
      if (!service) {
        const slugTry = rest.toLowerCase().replace(/\s+/g, '-');
        service = services.find((s) => s.slug === slugTry) || null;
      }

      // 3) name match (case-insensitive contains / equals)
      if (!service) {
        const q = rest.toLowerCase();
        service =
          services.find((s) => s.nameEn.toLowerCase() === q || s.nameSw?.toLowerCase() === q) ||
          services.find(
            (s) =>
              s.nameEn.toLowerCase().includes(q) ||
              (s.nameSw && s.nameSw.toLowerCase().includes(q)) ||
              s.slug.includes(q.replace(/\s+/g, '-'))
          ) ||
          null;
      }

      if (!service) {
        await reply(
          from,
          'Service not found.\n\nUse one of:\n' +
            '• BOOK underarm-wax\n' +
            '• BOOK Underarm Wax\n' +
            '• BOOK 4  (number from the list)\n\nType *2* to see the list again.'
        );
        return;
      }

      session.step = 'book_date';
      session.data = {
        serviceId: service.id,
        slug: service.slug,
        name: service.nameEn,
        price: service.price,
        duration: service.durationMinutes,
      };
      await reply(
        from,
        `*${service.nameEn}* — TZS ${service.price.toLocaleString()} (${service.durationMinutes} min)\n\n` +
          `Send preferred date as YYYY-MM-DD\nExample: 2026-10-28`
      );
      return;
    }

    if (session.step === 'book_date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        await reply(from, 'Use date format YYYY-MM-DD (example: 2026-10-25)');
        return;
      }
      session.data.date = text;
      // fetch slots via internal logic - call prisma
      const slotsRes = await fetch(
        `http://127.0.0.1:${process.env.PORT || 4000}/api/bookings/slots?date=${text}&serviceSlug=${session.data.slug}`
      ).catch(() => null);
      let slotLines = 'Morning 10:00, 11:00 · Afternoon 14:00, 15:00, 16:00';
      if (slotsRes && slotsRes.ok) {
        const j = await slotsRes.json();
        const slots = j.data?.slots || [];
        if (slots.length) {
          slotLines = slots
            .slice(0, 12)
            .map((s: any) => s.time)
            .join(', ');
          session.data.available = slots;
        } else {
          await reply(from, 'No slots that day. Send another date YYYY-MM-DD');
          return;
        }
      }
      session.step = 'book_time';
      await reply(from, `Available times on ${text}:\n${slotLines}\n\nReply with time e.g. 10:00`);
      return;
    }

    if (session.step === 'book_time') {
      const time = text.trim();
      const date = session.data.date;
      const iso = new Date(`${date}T${time}:00`);
      if (isNaN(iso.getTime())) {
        await reply(from, 'Invalid time. Use HH:MM e.g. 14:30');
        return;
      }
      session.data.scheduledAt = iso.toISOString();
      session.step = 'book_name';
      await reply(from, 'Your full name for the booking?');
      return;
    }

    if (session.step === 'book_name') {
      session.data.customerName = text;
      session.step = 'idle';
      const d = session.data;
      const bookingNumber =
        'EB-' +
        new Date().toISOString().slice(0, 10).replace(/-/g, '') +
        '-' +
        Math.random().toString(36).slice(2, 6).toUpperCase();
      try {
        const booking = await prisma.booking.create({
          data: {
            bookingNumber,
            serviceId: d.serviceId,
            customerName: d.customerName,
            customerPhone: from.startsWith('255') ? from : '255' + from.replace(/^0/, ''),
            scheduledAt: new Date(d.scheduledAt),
            durationMinutes: d.duration,
            price: d.price,
            status: 'PENDING',
            paymentStatus: 'PENDING',
          },
        });
        const appUrl = (process.env.APP_URL || 'https://emishbeautyspa.co.tz').replace(/\/$/, '');
        const payUrl = `${appUrl}/pay.html?booking=${encodeURIComponent(booking.bookingNumber)}&amount=${booking.price}&type=booking`;
        await reply(
          from,
          `✅ Booking *${booking.bookingNumber}*\n` +
            `${d.name}\n` +
            `When: ${new Date(d.scheduledAt).toLocaleString('en-TZ')}\n` +
            `Amount: TZS ${d.price.toLocaleString()}\n\n` +
            `Pay to confirm:\n${payUrl}\n\n` +
            `Or: PAY ${booking.bookingNumber}`
        );
      } catch (e: any) {
        console.error('WA book failed', e);
        await reply(from, 'Booking failed (slot may be taken). Type *2* to try again.');
      }
      return;
    }

    // PAY ref
    if (upper.startsWith('PAY ')) {
      const ref = text.split(/\s+/)[1]?.toUpperCase();
      const appUrl = (process.env.APP_URL || 'https://emishbeautyspa.co.tz').replace(/\/$/, '');
      if (ref?.startsWith('EB-')) {
        const b = await prisma.booking.findUnique({ where: { bookingNumber: ref } });
        if (!b) {
          await reply(from, 'Booking not found');
          return;
        }
        await reply(
          from,
          `Pay booking ${ref}:\n${appUrl}/pay.html?booking=${encodeURIComponent(ref)}&amount=${b.price}&type=booking`
        );
        return;
      }
      const o = await prisma.order.findUnique({ where: { orderNumber: ref } });
      if (!o) {
        await reply(from, 'Order not found');
        return;
      }
      await reply(
        from,
        `Pay order ${ref}:\n${appUrl}/pay.html?order=${encodeURIComponent(ref)}&amount=${o.total}`
      );
      return;
    }

    await reply(from, `I didn't get that.\n\n${MENU}`);
  } catch (err) {
    console.error('[WhatsApp webhook]', err);
  }
});

// Health / config tip
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    configured: isWhatsAppConfigured(),
    verifyTokenSet: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    phoneIdSet: Boolean(process.env.WHATSAPP_PHONE_ID && !String(process.env.WHATSAPP_PHONE_ID).includes('your_')),
    tokenSet: Boolean(process.env.WHATSAPP_TOKEN && !String(process.env.WHATSAPP_TOKEN).includes('your_')),
    webhookPath: '/api/whatsapp/webhook',
  });
});

export default router;
