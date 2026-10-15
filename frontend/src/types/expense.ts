export interface Category {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  title: string;
  amount: string;
  category_id: number | null;
  category_name: string;
  expense_date: string;
  payment_method: string;
  notes: string | null;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
