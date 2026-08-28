/**
 * Pesapal API 3.0 Service
 * Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
 * Sandbox: https://cybqa.pesapal.com/pesapalv3
 * Live:    https://pay.pesapal.com/v3
 */

const BASE_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
};

interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  env: 'sandbox' | 'live';
}

let cachedToken: { token: string; expires: number } | null = null;

function getConfig(): PesapalConfig {
  return {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || '',
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || '',
    env: (process.env.PESAPAL_ENV as 'sandbox' | 'live') || 'sandbox',
  };
}

function getBaseUrl() {
  return BASE_URLS[getConfig().env];
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  const { consumerKey, consumerSecret } = getConfig();
  if (!consumerKey || !consumerSecret) {
    throw new Error('Pesapal credentials not configured');
  }

  const res = await fetch(`${getBaseUrl()}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = await res.json() as any;
  if (!data.token) {
    throw new Error(data.error?.message || 'Failed to get Pesapal token');
  }

  // Token valid ~5 minutes
  cachedToken = {
    token: data.token,
    expires: Date.now() + 4 * 60 * 1000,
  };
  return data.token;
}

export async function registerIPN(ipnUrl: string, notificationType: 'GET' | 'POST' = 'POST') {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: notificationType,
    }),
  });
  return res.json();
}

export async function submitOrder(payload: {
  id: string; // merchant reference (order number)
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string; // IPN id from registerIPN
  billing_address: {
    email_address?: string;
    phone_number: string;
    country_code: string;
    first_name: string;
    last_name: string;
    line_1?: string;
    city?: string;
  };
}) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{
    order_tracking_id: string;
    merchant_reference: string;
    redirect_url: string;
    status: string;
  }>;
}

export async function getTransactionStatus(orderTrackingId: string) {
  const token = await getAccessToken();
  const res = await fetch(
    `${getBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.json();
}
