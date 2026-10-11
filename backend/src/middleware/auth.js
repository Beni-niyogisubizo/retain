import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters');
}

export function createToken(userId) {
  return jwt.sign({}, secret, {
    subject: String(userId),
    expiresIn: '1h',
    algorithm: 'HS256',
    issuer: 'retain-api',
    audience: 'retain-client',
  });
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const match = typeof header === 'string'
    ? header.match(/^Bearer (\S+)$/)
    : null;

  if (!match) {
    return res.status(401).json({ message: 'Sign in to continue' });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], secret, {
      algorithms: ['HS256'],
      issuer: 'retain-api',
      audience: 'retain-client',
    });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  if (typeof payload !== 'object' || !/^[1-9]\d*$/.test(payload.sub || '')) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const [users] = await pool.execute(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [payload.sub]
  );

  if (!users.length) {
    return res.status(401).json({ message: 'Account not found' });
  }

  req.user = users[0];
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
}
