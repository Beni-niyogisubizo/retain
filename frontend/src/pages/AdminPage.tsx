import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiRequest } from '../api/client';
import { CategoryManager } from '../components/CategoryManager';
import { useAuth } from '../hooks/useAuth';
import type { AdminInsights, CategoryStat } from '../types/admin';
import type { Category } from '../types/expense';

function CategoryRanking({ title, categories }: {
  title: string;
  categories: CategoryStat[];
}) {
  return (
    <section className="summary-card">
      <h2>{title}</h2>
      {categories.length === 0 ? <p>No categories yet.</p> : (
        <ol className="summary-list">
          {categories.map((category) => (
            <li key={category.id}>
              <span>{category.name}</span>
              <strong>{category.expense_count} expenses</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AdminPage() {
  const { token, signOut } = useAuth();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    token: string;
    revision: number;
    data?: { insights: AdminInsights; categories: Category[] };
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    Promise.all([
      apiRequest<AdminInsights>(
        '/admin/insights', { signal: controller.signal }, token,
      ),
      apiRequest<{ categories: Category[] }>(
        '/categories', { signal: controller.signal }, token,
      ),
    ]).then(([insights, categoryResponse]) => {
      if (!controller.signal.aborted) {
        setResult({
          token,
          revision,
          data: { insights, categories: categoryResponse.categories },
        });
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }

      setResult({
        token,
        revision,
        error: error instanceof Error ? error.message : 'Unable to load admin data',
      });
    });

    return () => controller.abort();
  }, [token, revision, signOut]);

  const current = result?.token === token && result.revision === revision
    ? result : null;
  const data = current?.data;
  const insights = data?.insights;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <Link className="brand" to="/dashboard">Retain</Link>
        <div className="actions">
          <Link to="/dashboard">My dashboard</Link>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <h1>Admin dashboard</h1>
      {!current && <p role="status">Loading platform insights...</p>}
      {current?.error && (
        <div role="alert">
          <p className="error">{current.error}</p>
          <button onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}

      {data && insights && (
        <>
          <section className="summary-grid" aria-label="Platform totals">
            {[
              ['Registered users', insights.total_users],
              ['Recorded expenses', insights.total_expenses],
              ['Total expense value', insights.total_expense_value],
              ['Expenses this month', insights.current_month_expenses],
            ].map(([label, value]) => (
              <article className="summary-card" key={label}>
                <h2>{label}</h2>
                <p className="summary-value">{value}</p>
              </article>
            ))}
          </section>

          <CategoryManager categories={data.categories}
            onChanged={() => setRevision((value) => value + 1)} />

          <section className="summary-card">
            <h2>Total spending per category</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Category</th><th>Expenses</th><th>Total spending</th></tr>
                </thead>
                <tbody>
                  {insights.spending_by_category.map((category) => (
                    <tr key={category.id ?? 'uncategorized'}>
                      <td>{category.name}</td>
                      <td>{category.expense_count}</td>
                      <td>{category.total_spent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="summary-grid">
            <CategoryRanking title="Top 5 most-used categories"
              categories={insights.top_categories} />
            <CategoryRanking title="Bottom 5 least-used categories"
              categories={insights.bottom_categories} />
          </div>

          <section className="summary-card">
            <h2>Recently added expenses</h2>
            {insights.recent_expenses.length === 0 ? <p>No expenses yet.</p> : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th><th>User</th><th>Category</th>
                      <th>Amount</th><th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.recent_expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.title}</td><td>{expense.user_name}</td>
                        <td>{expense.category_name}</td><td>{expense.amount}</td>
                        <td>{expense.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="summary-card">
            <h2>Recently registered users</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Registered</th></tr>
                </thead>
                <tbody>
                  {insights.recent_users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td><td>{user.email}</td>
                      <td>{user.role}</td><td>{user.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
