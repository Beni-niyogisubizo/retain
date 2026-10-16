import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Retain API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err.code || err.message);
  const status = err.status === 400
    ? 400
    : err.status === 413 ? 413 : 500;

  res.status(status).json({
    message: status === 400
      ? 'Invalid request body'
      : status === 413 ? 'Request body too large' : 'Internal server error',
  });
});

try {
  await pool.query('SELECT 1');
  console.log('MySQL connection successful');

  app.listen(port, () => {
    console.log(`Retain API running at http://localhost:${port}`);
  });
} catch (err) {
  console.error('Could not connect to MySQL:', err.code || err.message);
  await pool.end();
  process.exit(1);
}
