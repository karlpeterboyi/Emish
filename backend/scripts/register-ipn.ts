/**
 * One-time: register Pesapal IPN URL and print notification_id
 * Usage: npx tsx scripts/register-ipn.ts
 * Requires PESAPAL_* in .env and a publicly reachable HTTPS IPN URL
 */
import dotenv from 'dotenv';
dotenv.config();

import * as pesapal from '../src/services/pesapal.js';

async function main() {
  const url = process.env.PESAPAL_IPN_URL;
  if (!url || !url.startsWith('http')) {
    console.error('Set PESAPAL_IPN_URL in .env (must be public HTTPS in production)');
    process.exit(1);
  }
  if (!pesapal.isPesapalConfigured()) {
    console.error('Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET');
    process.exit(1);
  }

  console.log('Registering IPN:', url);
  const result = await pesapal.registerIPN(url, 'POST');
  console.log(JSON.stringify(result, null, 2));

  const id = (result as any).ipn_id || (result as any).notification_id;
  if (id) {
    console.log('\n→ Add this to your .env:');
    console.log(`PESAPAL_IPN_ID=${id}`);
  }

  console.log('\nExisting IPNs:');
  console.log(JSON.stringify(await pesapal.listIPNs(), null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
