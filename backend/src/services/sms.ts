/**
 * Africa's Talking SMS Service for Tanzania
 * Docs: https://developers.africastalking.com/docs/sms/overview
 *
 * Setup:
 * 1. npm install africastalking
 * 2. Set AT_USERNAME + AT_API_KEY in .env
 * 3. For sandbox use username = "sandbox"
 */

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const username = process.env.AT_USERNAME || 'sandbox';
  const apiKey = process.env.AT_API_KEY;

  let phone = to.replace(/\s+/g, '');
  if (phone.startsWith('0')) phone = '+255' + phone.slice(1);
  if (phone.startsWith('255')) phone = '+' + phone;
  if (!phone.startsWith('+')) phone = '+255' + phone;

  if (!apiKey || apiKey.includes('your_')) {
    console.log(`[SMS DEMO] → ${phone}`);
    console.log(`[SMS DEMO] ${message}`);
    return true;
  }

  try {
    // Dynamic import so the package is optional until installed
    const AfricasTalking = (await import('africastalking')).default({
      apiKey,
      username,
    });
    const result = await AfricasTalking.SMS.send({
      to: [phone],
      message,
      from: process.env.AT_SENDER_ID || undefined,
    });
    console.log('[SMS] Sent:', JSON.stringify(result));
    return true;
  } catch (err: any) {
    console.error('[SMS] Failed:', err?.message || err);
    return false;
  }
}

export async function sendOrderConfirmation(phone: string, orderNumber: string, total: number) {
  const msg = `Asante kwa kununua Niffer Cosmetics! Oda yako ${orderNumber} ya TZS ${total.toLocaleString()} imepokelewa. Tutawasiliana hivi karibuni. Karibu tena!`;
  return sendSMS(phone, msg);
}

export async function sendPaymentSuccess(phone: string, orderNumber: string) {
  const msg = `Malipo yamefanikiwa! Oda ${orderNumber} inashughulikiwa sasa. Niffer Cosmetics – Glow Naturally ✨`;
  return sendSMS(phone, msg);
}

export async function sendOTP(phone: string, code: string) {
  const msg = `Niffer Cosmetics OTP: ${code}. Valid for 10 minutes. Do not share.`;
  return sendSMS(phone, msg);
}
