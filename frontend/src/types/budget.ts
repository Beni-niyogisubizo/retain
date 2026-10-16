import type { Expense } from './expense';

export interface Budget {
  id: number;
  month: string;
  amount: string;
}

export interface MonthlySummary {
  month: string;
  budget: Budget | null;
  total_spent: string;
  remaining_budget: string | null;
  budget_status: 'not_set' | 'within' | 'approaching' | 'over';
  expense_count: number;
  highest_expense: {
    id: number;
    title: string;
    amount: string;
    expense_date: string;
  } | null;
  spending_by_category: {
    category_id: number | null;
    category_name: string;
    expense_count: number;
    total_spent: string;
  }[];
  recent_expenses: Expense[];
}
