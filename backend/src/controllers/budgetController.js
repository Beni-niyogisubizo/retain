import { pool } from '../config/db.js';

function monthDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return null;
  }

  if (Number(value.slice(0, 4)) < 1000) return null;
  return `${value}-01`;
}

export async function setBudget(req, res) {
  const month = monthDate(req.params.month);
  const rawAmount = req.body?.amount;
  const amount = typeof rawAmount === 'string' || typeof rawAmount === 'number'
    ? String(rawAmount)
    : '';

  if (!month) {
    return res.status(400).json({ message: 'Use a month in YYYY-MM format' });
  }

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    return res.status(400).json({
      message: 'Budget must be positive with at most 2 decimal places',
    });
  }

  await pool.execute(
    `INSERT INTO budgets (user_id, month, amount)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE amount = ?`,
    [req.user.id, month, amount, amount]
  );

  const [rows] = await pool.execute(
    'SELECT id, month, amount FROM budgets WHERE user_id = ? AND month = ?',
    [req.user.id, month]
  );

  res.json({ budget: rows[0] });
}

export async function getMonthlySummary(req, res) {
  const month = monthDate(req.params.month);

  if (!month) {
    return res.status(400).json({ message: 'Use a month in YYYY-MM format' });
  }

  const userId = req.user.id;
  const dateFilter = `
    e.user_id = ?
    AND e.expense_date >= ?
    AND e.expense_date < DATE_ADD(?, INTERVAL 1 MONTH)
  `;
  const params = [userId, month, month];

  const [budgets] = await pool.execute(
    'SELECT id, month, amount FROM budgets WHERE user_id = ? AND month = ?',
    [userId, month]
  );

  const [totals] = await pool.execute(
    `SELECT COUNT(*) AS expense_count,
       COALESCE(SUM(e.amount), 0.00) AS total_spent
     FROM expenses e WHERE ${dateFilter}`,
    params
  );

  const [remainingRows] = await pool.execute(
    `SELECT b.amount - (
       SELECT COALESCE(SUM(e.amount), 0.00)
       FROM expenses e WHERE ${dateFilter}
     ) AS remaining_budget
     FROM budgets b WHERE b.user_id = ? AND b.month = ?`,
    [...params, userId, month]
  );

  const [highest] = await pool.execute(
    `SELECT e.id, e.title, e.amount, e.expense_date
     FROM expenses e WHERE ${dateFilter}
     ORDER BY e.amount DESC, e.id DESC LIMIT 1`,
    params
  );

  const [byCategory] = await pool.execute(
    `SELECT e.category_id,
       COALESCE(c.name, 'Uncategorized') AS category_name,
       COUNT(*) AS expense_count,
       SUM(e.amount) AS total_spent
     FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE ${dateFilter}
     GROUP BY e.category_id, c.name
     ORDER BY total_spent DESC, category_name ASC`,
    params
  );

  const [recent] = await pool.execute(
    `SELECT e.id, e.title, e.amount, e.category_id,
       COALESCE(c.name, 'Uncategorized') AS category_name,
       e.expense_date, e.payment_method, e.notes
     FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE ${dateFilter}
     ORDER BY e.created_at DESC, e.id DESC LIMIT 5`,
    params
  );

  const budget = budgets[0] ?? null;
  const totalSpent = String(totals[0].total_spent);
  let status = 'not_set';

  if (budget) {
    const toCents = (value) => {
      const [whole, fraction = ''] = String(value).split('.');
      return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    };

    const spentCents = toCents(totalSpent);
    const budgetCents = toCents(budget.amount);

    status = spentCents > budgetCents
      ? 'over'
      : spentCents * 100n >= budgetCents * 80n ? 'approaching' : 'within';
  }

  res.json({
    month: req.params.month,
    budget,
    total_spent: totalSpent,
    remaining_budget: remainingRows[0]?.remaining_budget ?? null,
    budget_status: status,
    expense_count: Number(totals[0].expense_count),
    highest_expense: highest[0] ?? null,
    spending_by_category: byCategory,
    recent_expenses: recent,
  });
}
