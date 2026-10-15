export interface ExpenseFilters {
  search: string;
  category: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  sort: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  page: number;
  pageSize: number;
}

export const initialFilters: ExpenseFilters = {
  search: '',
  category: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  sort: 'date_desc',
  page: 1,
  pageSize: 10,
};

type FilterChanges = Partial<Omit<ExpenseFilters, 'page'>>;

export type FiltersAction =
  | { type: 'filters/updated'; payload: FilterChanges }
  | { type: 'filters/pageChanged'; payload: number }
  | { type: 'filters/reset' };

export function updateFilters(payload: FilterChanges): FiltersAction {
  return { type: 'filters/updated', payload };
}

export function changePage(payload: number): FiltersAction {
  return { type: 'filters/pageChanged', payload };
}

export function resetFilters(): FiltersAction {
  return { type: 'filters/reset' };
}

export function filtersReducer(
  state: ExpenseFilters = initialFilters,
  action: FiltersAction,
): ExpenseFilters {
  switch (action.type) {
    case 'filters/updated':
      return { ...state, ...action.payload, page: 1 };

    case 'filters/pageChanged':
      return {
        ...state,
        page: Number.isSafeInteger(action.payload) && action.payload > 0
          ? action.payload
          : 1,
      };

    case 'filters/reset':
      return { ...initialFilters };

    default:
      return state;
  }
}
