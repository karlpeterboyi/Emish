import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    branch?: string | null;
  };
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'];
const FULL_ADMIN = ['SUPER_ADMIN', 'ADMIN'];

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }
  const token = header.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      phone: string;
      role: string;
      branch?: string;
    };
    req.user = decoded;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

/** Back-compat: any staff/admin role */
export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    return next(new AppError('Staff access required', 403));
  }
  next();
}

/** Only roles in the list may proceed */
export function requireRoles(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

export function canManageCatalog(role: string) {
  return ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(role);
}

export function canManageSettings(role: string) {
  return FULL_ADMIN.includes(role);
}

export function canProcessSales(role: string) {
  return [...ADMIN_ROLES, 'CASHIER'].includes(role);
}
