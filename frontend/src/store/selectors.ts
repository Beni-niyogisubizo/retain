import type { RootState } from './store';

export const selectFilters = (state: RootState) => state.filters;

export function selectExpenseQuery(state: RootState): string {
  const filters = selectFilters(state);
  const query = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
    sort: filters.sort,
  });

  const optionalFilters = {
    search: filters.search.trim(),
    category_id: filters.category,
    payment_method: filters.paymentMethod,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    min_amount: filters.minAmount,
    max_amount: filters.maxAmount,
  };

  for (const [key, value] of Object.entries(optionalFilters)) {
    if (value !== '') {
      query.set(key, value);
    }
  }

  return query.toString();
}
