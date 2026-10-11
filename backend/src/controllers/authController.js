import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { createToken } from '../middleware/auth.js';

function readCredentials(body) {
  const email = typeof body?.email === 'string'
    ? body.email.trim().toLowerCase()
    : '';
  const password = typeof body?.password === 'string'
    ? body.password
    : '';

  return { email, password };
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return password.length >= 8 && Buffer.byteLength(password, 'utf8') <= 72;
}

export async function register(req, res) {
  const { email, password } = readCredentials(req.body);
  const name = typeof req.body?.name === 'string'
    ? req.body.name.trim()
    : '';

  if (!name || name.length > 100) {
    return res.status(400).json({
      message: 'Name must contain between 1 and 100 characters',
    });
  }

  if (!validEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  if (!validPassword(password)) {
    return res.status(400).json({
      message: 'Password must have at least 8 characters and at most 72 bytes',
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let result;

  try {
    [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'user']
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    throw err;
  }

  const user = { id: result.insertId, name, email, role: 'user' };

  res.status(201).json({
    user,
    token: createToken(user.id),
  });
}

export async function login(req, res) {
  const { email, password } = readCredentials(req.body);

  if (!validEmail(email) || !validPassword(password)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const [users] = await pool.execute(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = ?',
    [email]
  );

  const account = users[0];

  if (!account || !(await bcrypt.compare(password, account.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };

  res.json({
    user,
    token: createToken(user.id),
  });
}

export function getMe(req, res) {
  res.json({ user: req.user });
}
