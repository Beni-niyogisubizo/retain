import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Category } from '../types/expense';

interface Props {
  categories: Category[];
  onChanged: () => void;
}

export function CategoryManager({ categories, onChanged }: Props) {
  const { token, signOut } = useAuth();
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      signOut();
      return;
    }
    setError(err instanceof Error ? err.message : 'Category request failed');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;

    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setError('Enter a category name between 1 and 100 characters.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await apiRequest(
        editing ? `/categories/${editing.id}` : '/categories',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify({ name: trimmed }),
        },
        token,
      );
      setMessage(editing ? 'Category updated.' : 'Category created.');
      setEditing(null);
      setName('');
      onChanged();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    if (!token || busy) return;
    if (!window.confirm(
      `Delete "${category.name}"? Its expenses will become Uncategorized.`,
    )) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await apiRequest(`/categories/${category.id}`, { method: 'DELETE' }, token);
      if (editing?.id === category.id) {
        setEditing(null);
        setName('');
      }
      setMessage('Category deleted. Its expenses were preserved.');
      onChanged();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="summary-card">
      <h2>Manage categories</h2>
      <form onSubmit={save}>
        <label>
          {editing ? 'Edit category name' : 'New category name'}
          <input required maxLength={100} value={name} disabled={busy}
            onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="actions">
          <button disabled={busy} type="submit">
            {busy ? 'Please wait...' : editing ? 'Save changes' : 'Create category'}
          </button>
          {editing && (
            <button type="button" disabled={busy} onClick={() => {
              setEditing(null);
              setName('');
              setError('');
            }}>Cancel editing</button>
          )}
        </div>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {categories.length === 0 ? <p>No categories yet.</p> : (
        <ul className="summary-list">
          {categories.map((category) => (
            <li key={category.id}>
              <span>{category.name}</span>
              <div className="actions">
                <button disabled={busy} onClick={() => {
                  setEditing(category);
                  setName(category.name);
                  setError('');
                  setMessage('');
                }}>Edit</button>
                <button disabled={busy} onClick={() => void remove(category)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
