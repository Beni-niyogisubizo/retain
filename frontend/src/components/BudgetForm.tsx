import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Budget } from '../types/budget';

interface Props {
  month: string;
  budget: Budget | null;
  onSaved: () => void;
}

export function BudgetForm({ month, budget, onSaved }: Props) {
  const { token, signOut } = useAuth();
  const [amount, setAmount] = useState(budget?.amount ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || saving) return;

    if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('Enter a positive budget with at most 2 decimal places.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest<{ budget: Budget }>(
        `/budgets/${month}`,
        { method: 'PUT', body: JSON.stringify({ amount }) },
        token,
      );
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to save budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="summary-card">
      <h2>{budget ? 'Update monthly budget' : 'Set monthly budget'}</h2>
      <form onSubmit={submit}>
        <label>
          Budget for {month}
          <input
            type="number"
            required
            min="0.01"
            max="9999999999.99"
            step="0.01"
            value={amount}
            disabled={saving}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={saving} type="submit">
          {saving ? 'Saving...' : 'Save budget'}
        </button>
      </form>
    </section>
  );
}
