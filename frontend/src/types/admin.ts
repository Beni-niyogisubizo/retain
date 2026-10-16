export interface CategoryStat {
  id: number | null;
  name: string;
  expense_count: number;
  total_spent: string;
}

export interface AdminInsights {
  total_users: number;
  total_expenses: number;
  total_expense_value: string;
  current_month_expenses: number;
  spending_by_category: CategoryStat[];
  top_categories: CategoryStat[];
  bottom_categories: CategoryStat[];
  recent_expenses: {
    id: number;
    title: string;
    amount: string;
    expense_date: string;
    created_at: string;
    user_name: string;
    category_name: string;
  }[];
  recent_users: {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    created_at: string;
  }[];
}
