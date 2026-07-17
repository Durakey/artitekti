import type { ProjectCategory, ProjectStatus } from "@/lib/projects/constants";

export type Project = {
  id: string;
  name: string;
  client_name: string;
  location: string | null;
  category: ProjectCategory;
  status: ProjectStatus;
  deadline: string | null;
  completion_percent: number;
  budget_amount: number;
  currency: string;
  updated_at: string;
};

export type ProjectListMetrics = {
  total_products: number;
  bought_products: number;
  remaining_products: number;
  spent_budget: number;
  remaining_budget: number;
  payment_overdue_count: number;
  payment_due_today_count: number;
  payment_due_tomorrow_count: number;
};

export type ProjectListItem = Project & ProjectListMetrics;

export type ProjectsDashboardSummary = {
  active_projects: number;
  total_products: number;
  bought_products: number;
  remaining_products: number;
  spent_budget: number;
  total_budget: number;
};

export type PaymentDuePriority = "overdue" | "due_today" | "due_soon" | "upcoming";

export type PaymentDueItem = {
  payment_id: string;
  product_id: string;
  room_id: string;
  project_id: string;
  project_name: string;
  room_name: string;
  store_name: string;
  amount: number;
  currency: string;
  due_date: string;
  priority: PaymentDuePriority;
  days_diff: number;
};
