/**
 * WhatsApp notifications for Emish Beauty Spa
 * 1) Meta Cloud API when WHATSAPP_TOKEN + WHATSAPP_PHONE_ID set
 * 2) Otherwise logs (demo) and optional SMS fallback is done by caller
 */

function normalizePhone(to: string): string {
  let phone = to.replace(/\s+/g, '').replace(/^\+/, '');
  if (phone.startsWith('0')) phone = '255' + phone.slice(1);
  if (!phone.startsWith('255')) phone = '255' + phone;
  return phone;
}

export function isWhatsAppConfigured(): boolean {
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_ID || '';
  return Boolean(token && phoneId && !token.includes('your_'));
}

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const phone = normalizePhone(to);
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_ID || '';

  if (!isWhatsAppConfigured()) {
    console.log(`[WhatsApp DEMO] → +${phone}`);
    console.log(`[WhatsApp DEMO] ${message}`);
    return true;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[WhatsApp] failed', data);
      return false;
    }
    console.log('[WhatsApp] OK');
    return true;
  } catch (err: any) {
    console.error('[WhatsApp] error', err?.message || err);
    return false;
  }
}

export async function notifyBookingPaid(opts: {
  phone: string;
  bookingNumber: string;
  serviceName: string;
  when: string;
  amount: number;
  durationMinutes: number;
}) {
  const msg =
    `Emish Beauty Spa ✅ Booking confirmed!\n\n` +
    `Ref: ${opts.bookingNumber}\n` +
    `Service: ${opts.serviceName}\n` +
    `When: ${opts.when}\n` +
    `Duration: ${opts.durationMinutes} min\n` +
    `Paid: TZS ${opts.amount.toLocaleString('en-TZ')}\n\n` +
    `Branches: Dar (Sinza) · Arusha · Dodoma\n` +
    `Help: 0672 283 434 / 0746 541 544\n` +
    `Karibu!`;
  return sendWhatsApp(opts.phone, msg);
}

/** Admin alert on new paid booking */
export async function notifyAdminBooking(opts: {
  bookingNumber: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  when: string;
  amount: number;
}) {
  const admin = process.env.WHATSAPP_ADMIN_PHONE || process.env.ADMIN_WHATSAPP || '255672283434';
  const msg =
    `New paid booking\n` +
    `${opts.bookingNumber}\n` +
    `${opts.serviceName}\n` +
    `${opts.customerName} · ${opts.customerPhone}\n` +
    `${opts.when}\n` +
    `TZS ${opts.amount.toLocaleString('en-TZ')}`;
  return sendWhatsApp(admin, msg);
}
