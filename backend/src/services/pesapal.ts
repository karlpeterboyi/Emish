/**
 * Pesapal API 3.0 — Sandbox & Live
 * Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
 * Sandbox: https://cybqa.pesapal.com/pesapalv3
 * Live:    https://pay.pesapal.com/v3
 */

const BASE_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
} as const;

export type PesapalEnv = 'sandbox' | 'live';

function getConfig() {
  const env = (process.env.PESAPAL_ENV as PesapalEnv) || 'sandbox';
  return {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || '',
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || '',
    env,
    baseUrl: BASE_URLS[env] || BASE_URLS.sandbox,
  };
}

export function isPesapalConfigured(): boolean {
  const { consumerKey, consumerSecret } = getConfig();
  return Boolean(
    consumerKey &&
      consumerSecret &&
      !consumerKey.includes('your_') &&
      consumerKey.length > 10
  );
}

let cachedToken: { token: string; expires: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  const { consumerKey, consumerSecret, baseUrl } = getConfig();
  if (!consumerKey || !consumerSecret) {
    throw new Error('Pesapal credentials not configured (PESAPAL_CONSUMER_KEY / SECRET)');
  }

  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = (await res.json()) as { token?: string; error?: { message?: string }; message?: string };
  if (!data.token) {
    throw new Error(data.error?.message || data.message || 'Failed to get Pesapal access token');
  }

  cachedToken = { token: data.token, expires: Date.now() + 4 * 60 * 1000 };
  return data.token;
}

export async function registerIPN(ipnUrl: string, notificationType: 'GET' | 'POST' = 'POST') {
  const token = await getAccessToken();
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
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
  return res.json() as Promise<{
    url?: string;
    created_date?: string;
    ipn_id?: string;
    notification_id?: string;
    error?: { message?: string };
  }>;
}

export async function listIPNs() {
  const token = await getAccessToken();
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/api/URLSetup/GetIpnList`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function submitOrder(payload: {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: {
    email_address?: string;
    phone_number: string;
    country_code: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    line_1?: string;
    line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    zip_code?: string;
  };
}) {
  const token = await getAccessToken();
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as {
    order_tracking_id?: string;
    merchant_reference?: string;
    redirect_url?: string;
    status?: string;
    error?: { message?: string; code?: string };
  };

  if (!data.order_tracking_id || !data.redirect_url) {
    throw new Error(data.error?.message || 'Pesapal SubmitOrderRequest failed');
  }

  return data as {
    order_tracking_id: string;
    merchant_reference: string;
    redirect_url: string;
    status: string;
  };
}

export async function getTransactionStatus(orderTrackingId: string) {
  const token = await getAccessToken();
  const { baseUrl } = getConfig();
  const res = await fetch(
    `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.json() as Promise<{
    payment_method?: string;
    amount?: number;
    currency?: string;
    payment_status_description?: string;
    description?: string;
    status_code?: number;
    merchant_reference?: string;
    order_tracking_id?: string;
  }>;
}
