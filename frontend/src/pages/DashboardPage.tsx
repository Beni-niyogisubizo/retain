import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiRequest } from '../api/client';
import { BudgetForm } from '../components/BudgetForm';
import { useAuth } from '../hooks/useAuth';
import type { MonthlySummary } from '../types/budget';

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const statusLabels = {
  not_set: 'No budget set',
  within: 'Within budget',
  approaching: 'Approaching budget limit',
  over: 'Over budget',
};

export function DashboardPage() {
  const { user, token, signOut } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{
    month: string;
    token: string;
    revision: number;
    data?: MonthlySummary;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    apiRequest<MonthlySummary>(
      `/budgets/${month}`, { signal: controller.signal }, token,
    ).then((data) => {
      if (!controller.signal.aborted) {
        setResult({ month, token, revision, data });
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }

      setResult({
        month,
        token,
        revision,
        error: error instanceof Error ? error.message : 'Unable to load dashboard',
      });
    });

    return () => controller.abort();
  }, [month, token, revision, signOut]);

  const current = result?.month === month && result.token === token
    && result.revision === revision ? result : null;
  const data = current?.data;

  const spentPercent = data?.budget
    ? Number(data.total_spent) / Number(data.budget.amount) * 100
    : null;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <span className="brand">Retain</span>
        <div className="actions">
          <Link to="/expenses">Manage expenses</Link>
          {user?.role === 'admin' && <Link to="/admin">Admin dashboard</Link>}
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <h1>Welcome, {user?.name}</h1>

      <label className="month-picker">
        Selected month
        <input
          type="month"
          min="1000-01"
          max="9999-12"
          required
          value={month}
          onChange={(event) => {
            if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
              setMonth(event.target.value);
              setMessage('');
            }
          }}
        />
      </label>

      {message && <p role="status">{message}</p>}
      {!current && <p role="status">Loading monthly summary...</p>}

      {current?.error && (
        <div role="alert">
          <p className="error">{current.error}</p>
          <button onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}

      {data && (
        <>
          <section className="summary-grid" aria-label="Monthly totals">
            <article className="summary-card">
              <h2>Total spending</h2>
              <p className="summary-value">{data.total_spent}</p>
              <p>{data.expense_count} expenses</p>
            </article>

            <article className="summary-card">
              <h2>Monthly budget</h2>
              <p className="summary-value">{data.budget?.amount ?? 'Not set'}</p>
              <p>{statusLabels[data.budget_status]}</p>
            </article>

            <article className="summary-card">
              <h2>Remaining budget</h2>
              <p className="summary-value">{data.remaining_budget ?? 'Not set'}</p>
              {data.budget_status === 'over' && <p className="error">Budget exceeded</p>}
            </article>

            <article className="summary-card">
              <h2>Highest expense</h2>
              <p className="summary-value">{data.highest_expense?.amount ?? '—'}</p>
              <p>{data.highest_expense?.title ?? 'No expenses this month'}</p>
            </article>
          </section>

          {spentPercent !== null && (
            <section className="summary-card budget-progress">
              <label htmlFor="budget-progress">
                Budget used: {spentPercent.toFixed(1)}%
              </label>
              <progress id="budget-progress"
                value={Math.min(100, spentPercent)} max={100} />
              <p>
                {statusLabels[data.budget_status]}.
                {' '}Approaching starts at 80% of the monthly budget.
              </p>
            </section>
          )}

          <BudgetForm
            key={`${month}-${data.budget?.amount ?? 'new'}`}
            month={month}
            budget={data.budget}
            onSaved={() => {
              setMessage('Monthly budget saved.');
              setRevision((value) => value + 1);
            }}
          />

          <section className="summary-card">
            <h2>Spending by category</h2>
            {data.spending_by_category.length === 0 ? (
              <p>No spending this month.</p>
            ) : (
              <ul className="summary-list">
                {data.spending_by_category.map((category) => (
                  <li key={category.category_id ?? 'uncategorized'}>
                    <span>{category.category_name}</span>
                    <strong>{category.total_spent}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="summary-card">
            <h2>Recently added expenses in {month}</h2>
            {data.recent_expenses.length === 0 ? (
              <p>No expenses this month.</p>
            ) : (
              <ul className="summary-list">
                {data.recent_expenses.map((expense) => (
                  <li key={expense.id}>
                    <span>{expense.title} — {expense.expense_date}</span>
                    <strong>{expense.amount}</strong>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/expenses">Manage all expenses</Link>
          </section>
        </>
      )}
    </main>
  );
}
