import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiRequest } from '../api/client';
import { ExpenseFilters } from '../components/ExpenseFilters';
import { ExpenseForm } from '../components/ExpenseForm';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { changePage } from '../store/filtersReducer';
import { selectExpenseQuery, selectFilters } from '../store/selectors';
import type { Category, Expense, ExpenseListResponse } from '../types/expense';

export function ExpensesPage() {
  const { token, signOut } = useAuth();
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectFilters);
  const query = useAppSelector(selectExpenseQuery);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Expense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [result, setResult] = useState<{
    query: string;
    token: string;
    revision: number;
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
      if (!controller.signal.aborted) {
        setResult({ query, token, revision, data });
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }

      setResult({
        query,
        token,
        revision,
        error: error instanceof Error ? error.message : 'Unable to load expenses',
      });
    });

    return () => controller.abort();
  }, [query, token, revision, signOut]);

  const current = result?.query === query
    && result.token === token && result.revision === revision ? result : null;
  const data = current?.data;

  function saved() {
    setMessage(editor === 'new' ? 'Expense added.' : 'Expense updated.');
    setActionError('');
    setEditor(null);
    dispatch(changePage(1));
    setRevision((value) => value + 1);
  }

  async function remove(expense: Expense) {
    if (!token || deleting !== null) return;
    if (!window.confirm(`Delete "${expense.title}"? This cannot be undone.`)) return;

    setDeleting(expense.id);
    setActionError('');
    setMessage('');

    try {
      await apiRequest(
        `/expenses/${expense.id}`, { method: 'DELETE' }, token,
      );

      if (editor !== null && editor !== 'new' && editor.id === expense.id) {
        setEditor(null);
      }

      if (data?.expenses.length === 1 && filters.page > 1) {
        dispatch(changePage(filters.page - 1));
      }

      setRevision((value) => value + 1);
      setMessage('Expense deleted.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        return;
      }
      setActionError(
        error instanceof Error ? error.message : 'Unable to delete expense',
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <Link className="brand" to="/dashboard">Retain</Link>
        <Link to="/dashboard">Dashboard</Link>
      </header>

      <div className="dashboard-header">
        <h1>Your expenses</h1>
        <button disabled={editor !== null} onClick={() => {
          setEditor('new');
          setMessage('');
          setActionError('');
        }}>Add expense</button>
      </div>

      {message && <p role="status">{message}</p>}
      {actionError && <p className="error" role="alert">{actionError}</p>}

      {editor !== null && (
        <ExpenseForm
          key={editor === 'new' ? 'new' : editor.id}
          categories={categories}
          expense={editor === 'new' ? undefined : editor}
          onSaved={saved}
          onCancel={() => setEditor(null)}
        />
      )}

      <ExpenseFilters categories={categories} />
      {categoryError && <p className="error" role="alert">{categoryError}</p>}
      {!current && <p role="status">Loading expenses...</p>}
      {current?.error && (
        <div role="alert">
          <p className="error">{current.error}</p>
          <button onClick={() => setRevision((value) => value + 1)}>Retry</button>
        </div>
      )}

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
                    <th>Date</th><th>Payment</th><th>Notes</th><th>Actions</th>
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
                      <td>
                        <div className="actions">
                          <button disabled={editor !== null || deleting !== null}
                            onClick={() => {
                              setEditor(expense);
                              setMessage('');
                              setActionError('');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}>Edit</button>
                          <button disabled={deleting !== null || editor !== null}
                            onClick={() => void remove(expense)}>
                            {deleting === expense.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <nav className="pagination" aria-label="Expense pages">
            <button disabled={filters.page <= 1 || deleting !== null}
              onClick={() => dispatch(changePage(filters.page - 1))}>
              Previous
            </button>
            <span>Page {filters.page} of {Math.max(1, data.pagination.total_pages)}</span>
            <button
              disabled={filters.page >= data.pagination.total_pages || deleting !== null}
              onClick={() => dispatch(changePage(filters.page + 1))}>
              Next
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
