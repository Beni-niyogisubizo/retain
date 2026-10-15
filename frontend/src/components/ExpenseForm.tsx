import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Category, Expense } from '../types/expense';

interface Props {
  categories: Category[];
  expense?: Expense;
  onSaved: () => void;
  onCancel: () => void;
}

function today() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function ExpenseForm({ categories, expense, onSaved, onCancel }: Props) {
  const { token, signOut } = useAuth();
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(expense?.amount ?? '');
  const [category, setCategory] = useState(
    expense?.category_id == null ? '' : String(expense.category_id),
  );
  const [date, setDate] = useState(expense?.expense_date ?? today());
  const [payment, setPayment] = useState(expense?.payment_method ?? 'cash');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || saving) return;

    if (!title.trim() || !/^\d{1,10}(\.\d{1,2})?$/.test(amount)
      || Number(amount) <= 0) {
      setError('Enter a title and a positive amount with at most 2 decimal places.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiRequest<{ expense: Expense }>(
        expense ? `/expenses/${expense.id}` : '/expenses',
        {
          method: expense ? 'PUT' : 'POST',
          body: JSON.stringify({
            title: title.trim(),
            amount,
            category_id: category === '' ? null : Number(category),
            expense_date: date,
            payment_method: payment,
            notes: notes.trim() || null,
          }),
        },
        token,
      );
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="expense-form-card">
      <h2>{expense ? 'Edit expense' : 'Add expense'}</h2>
      <form onSubmit={submit}>
        <fieldset disabled={saving}>
          <label>
            Title
            <input required maxLength={150} value={title}
              onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Amount
            <input type="number" required min="0.01" max="9999999999.99"
              step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" required min="1000-01-01" max="9999-12-31"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Payment method
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="mobile_money">Mobile money</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Notes (optional)
            <textarea maxLength={5000} rows={3} value={notes}
              onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save expense'}
          </button>
          <button type="button" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
