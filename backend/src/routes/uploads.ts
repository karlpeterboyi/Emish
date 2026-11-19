import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function publicBase(req: AuthRequest): string {
  const fromEnv = (process.env.API_PUBLIC_URL || process.env.APP_URL || '').replace(/\/$/, '');
  if (fromEnv && !fromEnv.includes('emish.store')) {
    // Prefer API host when APP_URL is the static site
  }
  const apiPublic = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  if (apiPublic) return apiPublic;
  // Derive from request (Render / local)
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return 'https://emish-api.onrender.com';
}

// POST /api/uploads/image  { image: "data:image/jpeg;base64,...", filename?: "product.jpg" }
router.post('/image', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { image, filename } = req.body;
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      throw new AppError('Invalid image data. Send base64 data URL (data:image/...).', 400);
    }

    const matches = image.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
    if (!matches) throw new AppError('Invalid base64 image', 400);

    let ext = matches[1].toLowerCase().replace('jpeg', 'jpg').replace('+xml', '');
    if (!['jpg', 'png', 'webp', 'gif', 'svg'].includes(ext)) ext = 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 6 * 1024 * 1024) {
      throw new AppError('Image too large (max 6MB)', 400);
    }

    const name = filename || `product-${Date.now()}.${ext}`;
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const base = publicBase(req);
    const url = `${base}/uploads/${safeName}`;
    res.json({ success: true, data: { url, path: `/uploads/${safeName}`, filename: safeName } });
  } catch (err) {
    next(err);
  }
});

export default router;
