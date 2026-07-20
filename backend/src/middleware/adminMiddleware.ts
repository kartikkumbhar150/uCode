import { Request, Response, NextFunction } from 'express';

// Hardcoded admin credentials for DSA sheet management
const ADMIN_EMAIL    = 'admin@leetsync.com';
const ADMIN_PASSWORD = 'kartikADM15';

/**
 * Middleware: checks for admin credentials in X-Admin-Key header.
 * Format: X-Admin-Key: admin@leetsync.com:kartikADM15
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const headerKey = req.headers['x-admin-key'] as string | undefined;

  // Allow: "email:password" in header
  const validFromHeader = headerKey === `${ADMIN_EMAIL}:${ADMIN_PASSWORD}`;

  // Fallback: body fields { adminEmail, adminPassword }
  const { adminEmail, adminPassword } = req.body || {};
  const validFromBody =
    adminEmail?.toLowerCase?.() === ADMIN_EMAIL && adminPassword === ADMIN_PASSWORD;

  if (validFromHeader || validFromBody) {
    return next();
  }

  return res.status(403).json({ message: 'Admin access required' });
};
