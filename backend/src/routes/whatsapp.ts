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

    // Active conversation steps take priority over menu numbers (so "2" = qty, not Services)
    if (session.step && session.step !== 'idle') {
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
        const orderNumber =
          'WA-' +
          new Date().toISOString().slice(0, 10).replace(/-/g, '') +
          '-' +
          Math.random().toString(36).slice(2, 6).toUpperCase();
        try {
          const shippingFee = total >= 50000 ? 0 : 3000;
          const order = await prisma.order.create({
            data: {
              orderNumber,
              customerName: d.customerName,
              customerPhone: from.startsWith('255') ? from : '255' + from.replace(/^0/, ''),
              shippingAddress: d.address,
              shippingCity: d.address.split(',').pop()?.trim() || 'Dar es Salaam',
              subtotal: total,
              shippingFee,
              total: total + shippingFee,
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
          const appUrl = (process.env.APP_URL || 'https://www.emish.store').replace(/\/$/, '');
          const payUrl = `${appUrl}/pay.html?order=${encodeURIComponent(order.orderNumber)}&amount=${order.total}`;
          await reply(
            from,
            `✅ Order *${order.orderNumber}*\n` +
              `${d.name} × ${d.qty}\n` +
              `Subtotal: TZS ${total.toLocaleString()}\n` +
              `Delivery: TZS ${shippingFee.toLocaleString()}\n` +
              `*Total: TZS ${order.total.toLocaleString()}*\n\n` +
              `Pay (Pesapal · Till · Bank):\n${payUrl}\n\n` +
              `Or reply: PAY ${order.orderNumber}`
          );
        } catch (e: any) {
          console.error('WA order failed', e);
          await reply(from, 'Could not create order. Type *1* to try again.');
        }
        return;
      }
      if (session.step === 'book_date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          await reply(from, 'Use date format YYYY-MM-DD (example: 2026-10-30)');
          return;
        }
        session.data.date = text;
        const slotsRes = await fetch(
          `http://127.0.0.1:${process.env.PORT || 4000}/api/bookings/slots?date=${text}&serviceSlug=${session.data.slug}`
        ).catch(() => null);
        let slotLines = 'Morning 10:00, 11:00 · Afternoon 14:00, 15:00, 16:00';
        if (slotsRes && slotsRes.ok) {
          const j = await slotsRes.json();
          const slots = j.data?.slots || [];
          if (slots.length) {
            slotLines = slots.slice(0, 12).map((s: any) => s.time).join(', ');
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
          const appUrl = (process.env.APP_URL || 'https://www.emish.store').replace(/\/$/, '');
          const payUrl = `${appUrl}/pay.html?booking=${encodeURIComponent(booking.bookingNumber)}&amount=${booking.price}&type=booking`;
          await reply(
            from,
            `✅ Booking *${booking.bookingNumber}*\n` +
              `${d.name}\n` +
              `When: ${new Date(d.scheduledAt).toLocaleString('en-TZ')}\n` +
              `Amount: TZS ${d.price.toLocaleString()}\n\n` +
              `Pay (Pesapal · Till · Bank):\n${payUrl}\n\n` +
              `Or: PAY ${booking.bookingNumber}`
          );
        } catch (e: any) {
          console.error('WA book failed', e);
          await reply(from, 'Booking failed (slot may be taken). Type *2* to try again.');
        }
        return;
      }

      // Browse services by category (must stay above menu 1/2)
      if (session.step === 'svc_cats') {
        const cats =
          session.data.categories ||
          (await prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } })).map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.nameEn,
          }));
        const asNum = parseInt(text, 10);
        if (!(String(asNum) === text.trim() && asNum >= 1 && asNum <= cats.length)) {
          await reply(from, 'Send a category number from the list, or type *2* again.');
          return;
        }
        const cat = cats[asNum - 1];
        const pageSize = 8;
        const services = await prisma.service.findMany({
          where: { isActive: true, categoryId: cat.id },
          orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
        });
        if (!services.length) {
          await reply(from, `No services in *${cat.name}* yet. Type *2* for other categories.`);
          return;
        }
        session.step = 'svc_list';
        session.data = {
          ...session.data,
          categoryId: cat.id,
          categoryName: cat.name,
          servicePage: 0,
          lastServiceList: services.map((s) => ({
            id: s.id,
            slug: s.slug,
            nameEn: s.nameEn,
            price: s.price,
            durationMinutes: s.durationMinutes,
          })),
        };
        const page = services.slice(0, pageSize);
        const lines = page.map(
          (s, i) =>
            `*${i + 1}.* *${s.nameEn}*\n  TZS ${s.price.toLocaleString()} · ${s.durationMinutes} min\n  BOOK ${s.slug}`
        );
        const more =
          services.length > pageSize
            ? `\n\nShowing 1–${page.length} of ${services.length}. Type *MORE* for next.`
            : '';
        await reply(
          from,
          `*${cat.name}*\n\n` +
            lines.join('\n\n') +
            more +
            `\n\nReply:\n• BOOK 1\n• BOOK ${page[0]?.slug || 'slug'}\n• *2* categories`
        );
        return;
      }

      if (session.step === 'svc_list') {
        if (upper === 'MORE' && session.data.lastServiceList?.length) {
          const pageSize = 8;
          const list = session.data.lastServiceList as any[];
          let pageIdx = (session.data.servicePage || 0) + 1;
          if (pageIdx * pageSize >= list.length) pageIdx = 0;
          session.data.servicePage = pageIdx;
          const start = pageIdx * pageSize;
          const page = list.slice(start, start + pageSize);
          const lines = page.map(
            (s: any, i: number) =>
              `*${start + i + 1}.* *${s.nameEn}*\n  TZS ${s.price.toLocaleString()} · ${s.durationMinutes} min\n  BOOK ${s.slug}`
          );
          const end = Math.min(start + page.length, list.length);
          await reply(
            from,
            `*${session.data.categoryName || 'Services'}* (${start + 1}–${end} of ${list.length})\n\n` +
              lines.join('\n\n') +
              `\n\nBOOK <number> · *MORE* · *2* categories`
          );
          return;
        }
        // plain number → BOOK n from current category list
        const asNum = parseInt(text, 10);
        const list = (session.data.lastServiceList || []) as any[];
        if (String(asNum) === text.trim() && asNum >= 1 && asNum <= list.length) {
          const hit = list[asNum - 1];
          const service = await prisma.service.findFirst({
            where: { OR: [{ id: hit.id }, { slug: hit.slug }], isActive: true },
          });
          if (!service) {
            await reply(from, 'Service not found. Type *2* to browse again.');
            return;
          }
          session.step = 'book_date';
          session.data = {
            ...session.data,
            serviceId: service.id,
            slug: service.slug,
            name: service.nameEn,
            price: service.price,
            duration: service.durationMinutes,
          };
          await reply(
            from,
            `*${service.nameEn}* — TZS ${service.price.toLocaleString()} (${service.durationMinutes} min)\n\n` +
              `Send preferred date as YYYY-MM-DD\nExample: 2026-11-12`
          );
          return;
        }
        // otherwise stay on list (user may type BOOK slug)
        if (upper !== 'MORE' && !upper.startsWith('BOOK')) {
          await reply(
            from,
            'Reply *BOOK 1* (or the number), *BOOK <slug>*, *MORE*, or *2* for categories.'
          );
          return;
        }
      }
    }


    if (upper === '1' || upper === 'SHOP' || upper.startsWith('SHOP')) {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 15,
        orderBy: [{ nameEn: 'asc' }],
      });
      // Remember list so ORDER 1..N matches exactly what we showed
      session.data = { ...(session.data || {}), lastProductList: products.map((x) => x.id) };
      const lines = products.map(
        (p, i) => `*${i + 1}.* *${p.nameEn}*\n   TZS ${p.price.toLocaleString()}\n   ORDER ${p.slug}`
      );
      await reply(
        from,
        `*Products*\n\n${lines.join('\n\n')}\n\nReply:\n• ORDER 9\n• ORDER shea-butter-hair-mask\n• ORDER Shea Butter Hair Mask`
      );
      return;
    }

    if (upper === '2' || upper === 'BOOK' || upper === 'BOOKING') {
      const cats = await prisma.serviceCategory.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      if (!cats.length) {
        await reply(from, 'No service categories yet. Call 0672 283 434.');
        return;
      }
      session.step = 'svc_cats';
      session.data = { categories: cats.map((c) => ({ id: c.id, slug: c.slug, name: c.nameEn })) };
      const lines = cats.map((c, i) => `*${i + 1}.* ${c.nameEn}${c.nameSw ? ` (${c.nameSw})` : ''}`);
      await reply(
        from,
        `*Book a service — choose category*\n\n` +
          lines.join('\n') +
          `\n\nReply with a number (e.g. *1*) or:\nCAT massage\nCAT body-contour\n\nThen pick a service.`
      );
      return;
    }

    // Category pick: number while in svc_cats, or CAT <slug|number>
    if (session.step === 'svc_cats' || upper.startsWith('CAT ')) {
      let catId: string | null = null;
      let catName = '';
      const cats =
        session.data.categories ||
        (
          await prisma.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' } })
        ).map((c) => ({ id: c.id, slug: c.slug, name: c.nameEn }));

      if (upper.startsWith('CAT ')) {
        const rest = text.slice(4).trim().toLowerCase();
        const asNum = parseInt(rest, 10);
        const hit =
          (String(asNum) === rest && cats[asNum - 1]) ||
          cats.find((c: any) => c.slug === rest || c.name.toLowerCase() === rest);
        if (hit) {
          catId = hit.id;
          catName = hit.name;
        }
      } else if (session.step === 'svc_cats') {
        const asNum = parseInt(text, 10);
        if (String(asNum) === text.trim() && asNum >= 1 && asNum <= cats.length) {
          catId = cats[asNum - 1].id;
          catName = cats[asNum - 1].name;
        }
      }

      if (!catId) {
        if (session.step === 'svc_cats') {
          await reply(from, 'Send a category number from the list, or CAT massage');
          return;
        }
      } else {
        const pageSize = 8;
        const services = await prisma.service.findMany({
          where: { isActive: true, categoryId: catId },
          orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
        });
        if (!services.length) {
          await reply(from, `No services in *${catName}* yet. Type *2* for categories.`);
          return;
        }
        session.step = 'svc_list';
        session.data = {
          ...session.data,
          categoryId: catId,
          categoryName: catName,
          servicePage: 0,
          lastServiceList: services.map((s) => ({
            id: s.id,
            slug: s.slug,
            nameEn: s.nameEn,
            price: s.price,
            durationMinutes: s.durationMinutes,
          })),
        };
        const page = services.slice(0, pageSize);
        const lines = page.map(
          (s, i) =>
            `*${i + 1}.* *${s.nameEn}*\n  TZS ${s.price.toLocaleString()} · ${s.durationMinutes} min\n  BOOK ${s.slug}`
        );
        const more =
          services.length > pageSize
            ? `\n\nShowing 1–${page.length} of ${services.length}. Type *MORE* for next page.`
            : '';
        await reply(
          from,
          `*${catName}*\n\n` +
            lines.join('\n\n') +
            more +
            `\n\nReply:\n• BOOK 1  (number on this list)\n• BOOK ${page[0]?.slug || 'slug'}\n• *2* categories again`
        );
        return;
      }
    }

    // MORE — next page of services in category
    if (upper === 'MORE' && session.step === 'svc_list' && session.data.lastServiceList?.length) {
      const pageSize = 8;
      const list = session.data.lastServiceList as any[];
      let pageIdx = (session.data.servicePage || 0) + 1;
      if (pageIdx * pageSize >= list.length) pageIdx = 0; // wrap
      session.data.servicePage = pageIdx;
      const start = pageIdx * pageSize;
      const page = list.slice(start, start + pageSize);
      const lines = page.map(
        (s: any, i: number) =>
          `*${start + i + 1}.* *${s.nameEn}*\n  TZS ${s.price.toLocaleString()} · ${s.durationMinutes} min\n  BOOK ${s.slug}`
      );
      const end = Math.min(start + page.length, list.length);
      await reply(
        from,
        `*${session.data.categoryName || 'Services'}* (${start + 1}–${end} of ${list.length})\n\n` +
          lines.join('\n\n') +
          `\n\nBOOK <number> or BOOK <slug> · *MORE* · *2* categories`
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
      // Same sort as the "1 / SHOP" list so numbers match
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: [{ nameEn: 'asc' }],
        take: 15,
      });
      let product = null as (typeof products)[0] | null;
      const asNum = parseInt(rest, 10);
      if (String(asNum) === rest.trim() && asNum >= 1) {
        // Prefer the exact list we last showed in this chat
        const lastIds: string[] | undefined = session.data?.lastProductList;
        if (lastIds && asNum <= lastIds.length) {
          product = products.find((x) => x.id === lastIds[asNum - 1]) || null;
          if (!product) {
            const byId = await prisma.product.findFirst({
              where: { id: lastIds[asNum - 1], isActive: true },
            });
            product = byId;
          }
        } else if (asNum <= products.length) {
          product = products[asNum - 1];
        }
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
      const rest = text.slice(5).trim();
      const allServices = await prisma.service.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
      });

      let service = null as (typeof allServices)[0] | null;

      // 1) numeric index from LAST shown list (preferred)
      const asNum = parseInt(rest, 10);
      if (String(asNum) === rest.trim() && asNum >= 1) {
        const last = (session.data.lastServiceList || []) as any[];
        if (last.length && asNum <= last.length) {
          const hit = last[asNum - 1];
          service = allServices.find((s) => s.id === hit.id || s.slug === hit.slug) || null;
        }
        // fallback: global index (avoid if list was category-scoped)
        if (!service && asNum <= allServices.length && !last.length) {
          service = allServices[asNum - 1];
        }
      }

      // 2) exact slug
      if (!service) {
        const slugTry = rest.toLowerCase().replace(/\s+/g, '-');
        service = allServices.find((s) => s.slug === slugTry) || null;
      }

      // 3) name match
      if (!service) {
        const q = rest.toLowerCase();
        service =
          allServices.find((s) => s.nameEn.toLowerCase() === q || s.nameSw?.toLowerCase() === q) ||
          allServices.find(
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
          'Service not found.\n\nUse:\n' +
            '• *2* → pick category → BOOK 3\n' +
            '• BOOK underarm-wax\n' +
            '• BOOK Underarm Wax\n\nType *2* to browse by category.'
        );
        return;
      }

      session.step = 'book_date';
      session.data = {
        ...session.data,
        serviceId: service.id,
        slug: service.slug,
        name: service.nameEn,
        price: service.price,
        duration: service.durationMinutes,
      };
      await reply(
        from,
        `*${service.nameEn}* — TZS ${service.price.toLocaleString()} (${service.durationMinutes} min)\n\n` +
          `Send preferred date as YYYY-MM-DD\nExample: 2026-11-12`
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
