/**
 * Free-tier friendly: ensure schema exists and seed once if empty.
 * Avoids needing Render Shell / failed build-time prisma.
 */
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function bootstrapDatabase() {
  // 1) Push schema (creates tables if missing) — safe to re-run
  try {
    console.log('[DB] prisma db push…');
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: process.env,
      timeout: 120_000,
    });
  } catch (err: any) {
    console.warn('[DB] prisma db push warning:', err?.message || err);
    // continue — tables may already exist
  }

  // 2) Seed only if no products and no admin-like user
  try {
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    if (productCount > 0 || userCount > 0) {
      console.log(`[DB] already has data (products=${productCount}, users=${userCount}) — skip seed`);
      return;
    }
  } catch (err: any) {
    console.warn('[DB] count failed (schema may still be settling):', err?.message || err);
  }

  try {
    console.log('[DB] empty database — running seed…');
    execSync('npx tsx prisma/seed.ts', {
      stdio: 'inherit',
      env: process.env,
      timeout: 180_000,
    });
    console.log('[DB] seed complete');
  } catch (err: any) {
    console.error('[DB] seed failed:', err?.message || err);
  }
}
