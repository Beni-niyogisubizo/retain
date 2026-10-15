import { useAppDispatch, useAppSelector } from '../store/hooks';
import { resetFilters, updateFilters } from '../store/filtersReducer';
import type { ExpenseFilters as Filters } from '../store/filtersReducer';
import { selectFilters } from '../store/selectors';
import type { Category } from '../types/expense';

export function ExpenseFilters({ categories }: { categories: Category[] }) {
  const filters = useAppSelector(selectFilters);
  const dispatch = useAppDispatch();

  return (
    <section className="filters" aria-label="Expense filters">
      <label>
        Search
        <input
          value={filters.search}
          maxLength={150}
          onChange={(e) => dispatch(updateFilters({ search: e.target.value }))}
          placeholder="Search title or notes"
        />
      </label>

      <label>
        Category
        <select
          value={filters.category}
          onChange={(e) => dispatch(updateFilters({ category: e.target.value }))}
        >
          <option value="">All categories</option>
          <option value="uncategorized">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>

      <label>
        Payment method
        <select
          value={filters.paymentMethod}
          onChange={(e) => dispatch(updateFilters({ paymentMethod: e.target.value }))}
        >
          <option value="">All methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="mobile_money">Mobile money</option>
          <option value="other">Other</option>
        </select>
      </label>

      {([
        ['dateFrom', 'From date', 'date'],
        ['dateTo', 'To date', 'date'],
        ['minAmount', 'Minimum amount', 'number'],
        ['maxAmount', 'Maximum amount', 'number'],
      ] as const).map(([key, label, type]) => (
        <label key={key}>
          {label}
          <input
            type={type}
            value={filters[key]}
            min={type === 'number' ? '0' : undefined}
            step={type === 'number' ? '0.01' : undefined}
            onChange={(e) => dispatch(updateFilters({ [key]: e.target.value }))}
          />
        </label>
      ))}

      <label>
        Sort by
        <select
          value={filters.sort}
          onChange={(e) => dispatch(updateFilters({
            sort: e.target.value as Filters['sort'],
          }))}
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </select>
      </label>

      <label>
        Expenses per page
        <select
          value={filters.pageSize}
          onChange={(e) => dispatch(updateFilters({ pageSize: Number(e.target.value) }))}
        >
          <option value={1}>1</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </label>

      <button type="button" onClick={() => dispatch(resetFilters())}>
        Reset filters
      </button>
    </section>
  );
}
