import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Simple base64 image upload for prototype (no multer dependency required)
// POST /api/uploads/image  { image: "data:image/jpeg;base64,...", filename?: "product.jpg" }
router.post('/image', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { image, filename } = req.body;
    if (!image || !image.startsWith('data:image/')) {
      throw new AppError('Invalid image data. Send base64 data URL.');
    }

    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) throw new AppError('Invalid base64 image');

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const name = filename || `img-${Date.now()}.${ext}`;
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${safeName}`;
    res.json({ success: true, data: { url, filename: safeName } });
  } catch (err) {
    next(err);
  }
});

export default router;
