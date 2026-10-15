import { pool } from '../config/db.js';

const paymentMethods = [
  'cash', 'card', 'bank_transfer', 'mobile_money', 'other',
];

function readId(value) {
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id <= 4294967295 ? id : null;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return Number(value.slice(0, 4)) >= 1000
    && !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value;
}

function validateExpense(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const rawAmount = body?.amount;
  const amount = typeof rawAmount === 'string' || typeof rawAmount === 'number'
    ? String(rawAmount)
    : '';
  const categoryId = body?.category_id == null
    ? null
    : readId(body.category_id);
  const notes = body?.notes == null ? null : body.notes;

  if (!title || title.length > 150) {
    return { error: 'Title must contain between 1 and 150 characters' };
  }

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    return { error: 'Amount must be positive with at most 2 decimal places' };
  }

  if (!validDate(body?.expense_date)) {
    return { error: 'Enter a valid date in YYYY-MM-DD format' };
  }

  if (!paymentMethods.includes(body?.payment_method)) {
    return { error: 'Invalid payment method' };
  }

  if (body?.category_id != null && categoryId === null) {
    return { error: 'Invalid category ID' };
  }

  if (notes !== null && (typeof notes !== 'string' || notes.length > 5000)) {
    return { error: 'Notes must be text with at most 5000 characters' };
  }

  return {
    value: {
      title,
      amount,
      category_id: categoryId,
      expense_date: body.expense_date,
      payment_method: body.payment_method,
      notes: typeof notes === 'string' ? notes.trim() : null,
    },
  };
}

const expenseSelect = `
  SELECT e.id, e.title, e.amount, e.category_id,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    e.expense_date, e.payment_method, e.notes,
    e.created_at, e.updated_at
  FROM expenses e
  LEFT JOIN categories c ON c.id = e.category_id
`;

async function findExpense(id, userId) {
  const [rows] = await pool.execute(
    `${expenseSelect} WHERE e.id = ? AND e.user_id = ?`,
    [id, userId]
  );
  return rows[0];
}

async function categoryExists(categoryId) {
  if (categoryId === null) return true;
  const [rows] = await pool.execute(
    'SELECT id FROM categories WHERE id = ?',
    [categoryId]
  );
  return rows.length > 0;
}

export async function listExpenses(req, res) {
  const page = readId(req.query.page ?? '1');
  const pageSize = readId(req.query.page_size ?? '10');

  if (!page || !pageSize || pageSize > 100) {
    return res.status(400).json({
      message: 'Use a positive page and a page_size between 1 and 100',
    });
  }

  const keys = [
    'search', 'category_id', 'payment_method',
    'date_from', 'date_to', 'min_amount', 'max_amount', 'sort',
  ];

  for (const key of keys) {
    if (req.query[key] !== undefined && typeof req.query[key] !== 'string') {
      return res.status(400).json({ message: `Invalid ${key}` });
    }
  }

  const search = (req.query.search ?? '').trim();
  const category = req.query.category_id ?? '';
  const payment = req.query.payment_method ?? '';
  const dateFrom = req.query.date_from ?? '';
  const dateTo = req.query.date_to ?? '';
  const minAmount = req.query.min_amount ?? '';
  const maxAmount = req.query.max_amount ?? '';
  const sort = req.query.sort ?? 'date_desc';

  const orders = {
    date_desc: 'e.expense_date DESC, e.id DESC',
    date_asc: 'e.expense_date ASC, e.id ASC',
    amount_desc: 'e.amount DESC, e.id DESC',
    amount_asc: 'e.amount ASC, e.id ASC',
  };

  if (!Object.hasOwn(orders, sort)) {
    return res.status(400).json({ message: 'Invalid sorting option' });
  }

  if (search.length > 150) {
    return res.status(400).json({ message: 'Search must not exceed 150 characters' });
  }

  if (category && category !== 'uncategorized' && !readId(category)) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  if (payment && !paymentMethods.includes(payment)) {
    return res.status(400).json({ message: 'Invalid payment method' });
  }

  if ((dateFrom && !validDate(dateFrom)) || (dateTo && !validDate(dateTo))) {
    return res.status(400).json({ message: 'Enter valid dates in YYYY-MM-DD format' });
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return res.status(400).json({ message: 'Start date must not follow end date' });
  }

  const amountPattern = /^\d{1,10}(\.\d{1,2})?$/;

  if (
    (minAmount && !amountPattern.test(minAmount)) ||
    (maxAmount && !amountPattern.test(maxAmount))
  ) {
    return res.status(400).json({
      message: 'Amount filters must be nonnegative with at most 2 decimal places',
    });
  }

  if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
    return res.status(400).json({
      message: 'Minimum amount must not exceed maximum amount',
    });
  }

  const conditions = ['e.user_id = ?'];
  const params = [req.user.id];

  if (search) {
    conditions.push('(LOCATE(?, e.title) > 0 OR LOCATE(?, COALESCE(e.notes, \'\')) > 0)');
    params.push(search, search);
  }

  if (category === 'uncategorized') {
    conditions.push('e.category_id IS NULL');
  } else if (category) {
    conditions.push('e.category_id = ?');
    params.push(Number(category));
  }

  if (payment) {
    conditions.push('e.payment_method = ?');
    params.push(payment);
  }

  if (dateFrom) {
    conditions.push('e.expense_date >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('e.expense_date <= ?');
    params.push(dateTo);
  }

  if (minAmount) {
    conditions.push('e.amount >= ?');
    params.push(minAmount);
  }

  if (maxAmount) {
    conditions.push('e.amount <= ?');
    params.push(maxAmount);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [counts] = await pool.execute(
    `SELECT COUNT(*) AS total FROM expenses e ${where}`,
    params
  );

  const total = Number(counts[0].total);
  const offset = (page - 1) * pageSize;

  const [expenses] = await pool.query(
    `${expenseSelect} ${where}
     ORDER BY ${orders[sort]}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  res.json({
    expenses,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  });
}

export async function getExpense(req, res) {
  const id = readId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid expense ID' });
  }

  const expense = await findExpense(id, req.user.id);
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  res.json({ expense });
}

export async function createExpense(req, res) {
  const { value, error } = validateExpense(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  if (!(await categoryExists(value.category_id))) {
    return res.status(400).json({ message: 'Category not found' });
  }

  let result;
  try {
    [result] = await pool.execute(
      `INSERT INTO expenses
       (user_id, title, amount, category_id, expense_date, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, value.title, value.amount, value.category_id,
        value.expense_date, value.payment_method, value.notes,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'Category no longer exists' });
    }
    throw err;
  }

  const expense = await findExpense(result.insertId, req.user.id);
  res.status(201).json({ expense });
}

export async function updateExpense(req, res) {
  const id = readId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid expense ID' });
  }

  if (!(await findExpense(id, req.user.id))) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  const { value, error } = validateExpense(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  if (!(await categoryExists(value.category_id))) {
    return res.status(400).json({ message: 'Category not found' });
  }

  try {
    await pool.execute(
      `UPDATE expenses SET title = ?, amount = ?, category_id = ?,
       expense_date = ?, payment_method = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [
        value.title, value.amount, value.category_id,
        value.expense_date, value.payment_method, value.notes,
        id, req.user.id,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'Category no longer exists' });
    }
    throw err;
  }

  const expense = await findExpense(id, req.user.id);
  if (!expense) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  res.json({ expense });
}

export async function deleteExpense(req, res) {
  const id = readId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid expense ID' });
  }

  const [result] = await pool.execute(
    'DELETE FROM expenses WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  res.json({ message: 'Expense deleted' });
}
