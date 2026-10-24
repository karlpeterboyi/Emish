/**
 * Africa's Talking SMS — Tanzania
 * https://developers.africastalking.com/
 *
 * npm install africastalking   (optionalDependency)
 * Sandbox: AT_USERNAME=sandbox
 * Live: production username + API key + TCRA-approved Sender ID
 */

function normalizePhone(to: string): string {
  let phone = to.replace(/\s+/g, '');
  if (phone.startsWith('0')) phone = '+255' + phone.slice(1);
  else if (phone.startsWith('255')) phone = '+' + phone;
  else if (!phone.startsWith('+')) phone = '+255' + phone;
  return phone;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const username = process.env.AT_USERNAME || 'sandbox';
  const apiKey = process.env.AT_API_KEY;
  const phone = normalizePhone(to);

  if (!apiKey || apiKey.includes('your_')) {
    console.log(`[SMS DEMO] → ${phone}`);
    console.log(`[SMS DEMO] ${message}`);
    return true;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AfricasTalking = require('africastalking')({ apiKey, username });
    const result = await AfricasTalking.SMS.send({
      to: [phone],
      message,
      from: process.env.AT_SENDER_ID || undefined,
    });
    console.log('[SMS] OK', JSON.stringify(result)?.slice(0, 200));
    return true;
  } catch (err: any) {
    console.error('[SMS] Failed:', err?.message || err);
    return false;
  }
}

export async function sendOrderConfirmation(phone: string, orderNumber: string, total: number) {
  const msg = `Asante kwa kununua Emish Beauty Spa! Oda ${orderNumber} (TZS ${total.toLocaleString()}) imepokelewa. Tutawasiliana hivi karibuni. Karibu tena!`;
  return sendSMS(phone, msg);
}

export async function sendPaymentSuccess(phone: string, orderNumber: string) {
  const msg = `Malipo yamefanikiwa! Oda ${orderNumber} inashughulikiwa sasa. Emish Beauty Spa – Glow Naturally.`;
  return sendSMS(phone, msg);
}

export async function sendShippingUpdate(phone: string, orderNumber: string, status: string) {
  const msg = `Oda ${orderNumber}: hali sasa ni ${status}. Emish Beauty Spa.`;
  return sendSMS(phone, msg);
}

export async function sendOTP(phone: string, code: string) {
  const msg = `Emish Beauty Spa OTP: ${code}. Inatumika kwa dakika 10. Usishiriki na mtu yeyote.`;
  return sendSMS(phone, msg);
}


export async function sendBookingPaid(
  phone: string,
  bookingNumber: string,
  serviceName: string,
  when: string,
  amount: number
) {
  const msg = `Emish Beauty Spa: Booking ${bookingNumber} confirmed. ${serviceName} on ${when}. Paid TZS ${amount.toLocaleString()}. Karibu! 0672283434`;
  return sendSMS(phone, msg);
}
