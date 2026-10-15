import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiRequest } from '../api/client';
import { ExpenseFilters } from '../components/ExpenseFilters';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { changePage } from '../store/filtersReducer';
import { selectExpenseQuery, selectFilters } from '../store/selectors';
import type { Category, ExpenseListResponse } from '../types/expense';

export function ExpensesPage() {
  const { token, signOut } = useAuth();
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const query = useAppSelector(selectExpenseQuery);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [result, setResult] = useState<{
    query: string;
    token: string;
    data?: ExpenseListResponse;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    apiRequest<{ categories: Category[] }>(
      '/categories', { signal: controller.signal }, token,
    ).then((response) => {
      if (!controller.signal.aborted) {
        setCategories(response.categories);
        setCategoryError('');
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setCategoryError(
        error instanceof Error ? error.message : 'Unable to load categories',
      );
    });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    apiRequest<ExpenseListResponse>(
      `/expenses?${query}`, { signal: controller.signal }, token,
    ).then((data) => {
      if (!controller.signal.aborted) setResult({ query, token, data });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }

      setResult({
        query,
        token,
        error: error instanceof Error ? error.message : 'Unable to load expenses',
      });
    });

    return () => controller.abort();
  }, [query, token, signOut]);

  const current = result?.query === query && result.token === token ? result : null;
  const data = current?.data;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <Link className="brand" to="/dashboard">Retain</Link>
        <Link to="/dashboard">Dashboard</Link>
      </header>

      <h1>Your expenses</h1>
      <ExpenseFilters categories={categories} />
      {categoryError && <p className="error" role="alert">{categoryError}</p>}

      {!current && <p role="status">Loading expenses...</p>}
      {current?.error && <p className="error" role="alert">{current.error}</p>}

      {data && (
        <>
          <p>{data.pagination.total} matching expenses</p>
          {data.expenses.length === 0 ? (
            <p>No expenses match your filters.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Your matching expenses</caption>
                <thead>
                  <tr>
                    <th>Title</th><th>Amount</th><th>Category</th>
                    <th>Date</th><th>Payment</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.title}</td>
                      <td>{expense.amount}</td>
                      <td>{expense.category_name}</td>
                      <td>{expense.expense_date}</td>
                      <td>{expense.payment_method.replaceAll('_', ' ')}</td>
                      <td>{expense.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav className="pagination" aria-label="Expense pages">
            <button
              disabled={filters.page <= 1}
              onClick={() => dispatch(changePage(filters.page - 1))}
            >Previous</button>
            <span>Page {filters.page} of {Math.max(1, data.pagination.total_pages)}</span>
            <button
              disabled={filters.page >= data.pagination.total_pages}
              onClick={() => dispatch(changePage(filters.page + 1))}
            >Next</button>
          </nav>
        </>
      )}
    </main>
  );
}
