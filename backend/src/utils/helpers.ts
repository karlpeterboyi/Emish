import { v4 as uuidv4 } from 'uuid';

export function generateReferralCode(name: string): string {
  const base = (name || 'NIFF').replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NC-${ymd}-${rand}`;
}

export function calculateShipping(subtotal: number, city: string): number {
  const threshold = Number(process.env.FREE_SHIPPING_THRESHOLD || 50000);
  if (subtotal >= threshold) return 0;

  const darKeywords = ['dar', 'dsm', 'sinza', 'kinondoni', 'ilala', 'temeke', 'ubungo', 'kigamboni', 'dar es salaam'];
  const isDar = darKeywords.some(k => city.toLowerCase().includes(k));
  return isDar 
    ? Number(process.env.SHIPPING_DAR || 3000) 
    : Number(process.env.SHIPPING_UPCOUNTRY || 8000);
}

export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('en-TZ', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + ' TZS';
}
