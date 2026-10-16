import { pool } from '../config/db.js';

export async function getAdminInsights(req, res) {
  const [userCounts] = await pool.execute(
    'SELECT COUNT(*) AS total_users FROM users'
  );

  const [expenseTotals] = await pool.execute(
    `SELECT COUNT(*) AS total_expenses,
       COALESCE(SUM(amount), 0.00) AS total_value,
       COUNT(CASE
         WHEN expense_date >= DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
          AND expense_date < DATE_ADD(
            DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH
          )
         THEN 1
       END) AS current_month_expenses
     FROM expenses`
  );

  const [categories] = await pool.execute(
    `SELECT c.id, c.name,
       COUNT(e.id) AS expense_count,
       COALESCE(SUM(e.amount), 0.00) AS total_spent
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id
     GROUP BY c.id, c.name
     ORDER BY total_spent DESC, c.name ASC`
  );

  const [uncategorized] = await pool.execute(
    `SELECT COUNT(*) AS expense_count,
       COALESCE(SUM(amount), 0.00) AS total_spent
     FROM expenses WHERE category_id IS NULL`
  );

  const categoryStats = categories.map((category) => ({
    ...category,
    expense_count: Number(category.expense_count),
  }));

  const topCategories = [...categoryStats]
    .sort((a, b) => b.expense_count - a.expense_count || a.id - b.id)
    .slice(0, 5);

  const bottomCategories = [...categoryStats]
    .sort((a, b) => a.expense_count - b.expense_count || a.id - b.id)
    .slice(0, 5);

  const [recentExpenses] = await pool.execute(
    `SELECT e.id, e.title, e.amount, e.expense_date, e.created_at,
       u.name AS user_name,
       COALESCE(c.name, 'Uncategorized') AS category_name
     FROM expenses e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN categories c ON c.id = e.category_id
     ORDER BY e.created_at DESC, e.id DESC LIMIT 5`
  );

  const [recentUsers] = await pool.execute(
    `SELECT id, name, email, role, created_at
     FROM users ORDER BY created_at DESC, id DESC LIMIT 5`
  );

  res.json({
    total_users: Number(userCounts[0].total_users),
    total_expenses: Number(expenseTotals[0].total_expenses),
    total_expense_value: expenseTotals[0].total_value,
    current_month_expenses: Number(expenseTotals[0].current_month_expenses),
    spending_by_category: [
      ...categoryStats,
      {
        id: null,
        name: 'Uncategorized',
        expense_count: Number(uncategorized[0].expense_count),
        total_spent: uncategorized[0].total_spent,
      },
    ],
    top_categories: topCategories,
    bottom_categories: bottomCategories,
    recent_expenses: recentExpenses,
    recent_users: recentUsers,
  });
}
