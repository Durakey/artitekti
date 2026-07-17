import { redirect } from "next/navigation";

import { ProjectList } from "@/components/projects/project-list";
import { isPurchasedFromAmounts, resolveSelectedOption, sumPaidPayments } from "@/lib/rooms/purchase";
import type { PaymentDueItem, Project, ProjectListItem, ProjectsDashboardSummary } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects" };

type RoomRow = {
  id: string;
  project_id: string;
  name: string;
};

type RoomProductRow = {
  id: string;
  room_id: string;
  selected_option_id: string | null;
};

type ProductOptionRow = {
  id: string;
  product_id: string;
  price: number | string | null;
  store_name: string;
  currency: string | null;
  is_selected: boolean;
};

type ProductPaymentRow = {
  id: string;
  product_id: string;
  amount: number | string;
  due_date: string;
  paid_at: string | null;
};

const toDateValue = (value: string | null) => (value ? Date.parse(`${value}T00:00:00`) : Number.POSITIVE_INFINITY);

export default async function ProjectsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const emptyDashboard: ProjectsDashboardSummary = {
      active_projects: 0,
      total_products: 0,
      bought_products: 0,
      remaining_products: 0,
      spent_budget: 0,
      total_budget: 0,
    };
    return <ProjectList projects={[]} dashboard={emptyDashboard} paymentDueItems={[]} />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, client_name, location, category, status, deadline, completion_percent, budget_amount, currency, updated_at")
    .eq("owner_id", user.id);

  const projects = (projectsData ?? []) as Project[];
  const projectIds = projects.map((project) => project.id);

  const { data: roomsData } = projectIds.length
    ? await supabase.from("rooms").select("id, project_id, name").in("project_id", projectIds)
    : { data: [] };

  const rooms = (roomsData ?? []) as RoomRow[];
  const roomToProjectId = new Map(rooms.map((room) => [room.id, room.project_id]));
  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));
  const roomIds = rooms.map((room) => room.id);

  const { data: roomProductsData } = roomIds.length
    ? await supabase
        .from("room_products")
        .select("id, room_id, selected_option_id")
        .in("room_id", roomIds)
    : { data: [] };

  const roomProducts = (roomProductsData ?? []) as RoomProductRow[];
  const productIds = roomProducts.map((product) => product.id);

  const { data: optionsData } = productIds.length
    ? await supabase
        .from("product_options")
        .select("id, product_id, price, store_name, currency, is_selected")
        .in("product_id", productIds)
    : { data: [] };

  const options = (optionsData ?? []) as ProductOptionRow[];
  const optionsByProductId = new Map<string, ProductOptionRow[]>();
  for (const option of options) {
    const existing = optionsByProductId.get(option.product_id) ?? [];
    existing.push(option);
    optionsByProductId.set(option.product_id, existing);
  }

  const { data: paymentsData } = productIds.length
    ? await supabase
        .from("room_product_payments")
        .select("id, product_id, amount, due_date, paid_at")
        .in("product_id", productIds)
    : { data: [] };

  const payments = (paymentsData ?? []) as ProductPaymentRow[];
  const paymentsByProductId = new Map<string, ProductPaymentRow[]>();
  for (const payment of payments) {
    const existing = paymentsByProductId.get(payment.product_id) ?? [];
    existing.push(payment);
    paymentsByProductId.set(payment.product_id, existing);
  }

  const now = new Date();
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const today = now.toISOString().slice(0, 10);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const metricsByProjectId = new Map(
    projects.map((project) => [
      project.id,
      {
        total_products: 0,
        bought_products: 0,
        spent_budget: 0,
        payment_overdue_count: 0,
        payment_due_today_count: 0,
        payment_due_tomorrow_count: 0,
      },
    ]),
  );

  for (const product of roomProducts) {
    const projectId = roomToProjectId.get(product.room_id);
    if (!projectId) continue;

    const projectMetrics = metricsByProjectId.get(projectId);
    if (!projectMetrics) continue;

    projectMetrics.total_products += 1;
    const productOptions = optionsByProductId.get(product.id) ?? [];
    const selectedOption = resolveSelectedOption(productOptions, product.selected_option_id);
    const paidAmount = selectedOption ? sumPaidPayments(paymentsByProductId.get(product.id) ?? []) : 0;
    projectMetrics.spent_budget += paidAmount;
    if (selectedOption && isPurchasedFromAmounts(Number(selectedOption.price ?? 0), paidAmount)) {
      projectMetrics.bought_products += 1;
    }
  }
  for (const payment of payments) {
    if (payment.paid_at) continue;

    const product = roomProducts.find((item) => item.id === payment.product_id);
    if (!product) continue;
    const projectId = roomToProjectId.get(product.room_id);
    if (!projectId) continue;

    const projectMetrics = metricsByProjectId.get(projectId);
    if (!projectMetrics) continue;

    if (payment.due_date < today) {
      projectMetrics.payment_overdue_count += 1;
      continue;
    }
    if (payment.due_date === today) {
      projectMetrics.payment_due_today_count += 1;
      continue;
    }
    if (payment.due_date === tomorrow) {
      projectMetrics.payment_due_tomorrow_count += 1;
    }
  }

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const roomProductById = new Map(roomProducts.map((product) => [product.id, product]));

  const paymentDueItems: PaymentDueItem[] = payments
    .filter((payment) => !payment.paid_at)
    .map((payment) => {
      const product = roomProductById.get(payment.product_id);
      if (!product) return null;

      const projectId = roomToProjectId.get(product.room_id);
      if (!projectId) return null;

      const project = projectById.get(projectId);
      if (!project) return null;

      const productOptions = optionsByProductId.get(product.id) ?? [];
      const selectedOption =
        productOptions.find((option) => option.id === product.selected_option_id) ??
        productOptions.find((option) => option.is_selected) ??
        null;

      const paymentsMs = 1000 * 60 * 60 * 24;
      const dueValue = toDateValue(payment.due_date);
      const todayValue = toDateValue(today);
      const daysDiff = Math.round((dueValue - todayValue) / paymentsMs);
      const priority: PaymentDueItem["priority"] = daysDiff < 0
        ? "overdue"
        : daysDiff === 0
          ? "due_today"
          : daysDiff <= 7
          ? "due_soon"
          : "upcoming";

      return {
        payment_id: payment.id,
        product_id: product.id,
        room_id: product.room_id,
        project_id: project.id,
        project_name: project.name,
        room_name: roomNameById.get(product.room_id) ?? "Unnamed room",
        store_name: selectedOption?.store_name ?? "No store selected",
        amount: Number(payment.amount ?? 0),
        currency: selectedOption?.currency ?? project.currency,
        due_date: payment.due_date,
        priority,
        days_diff: daysDiff,
      } satisfies PaymentDueItem;
    })
    .filter((item): item is PaymentDueItem => item !== null);

  const priorityRank: Record<PaymentDueItem["priority"], number> = {
    overdue: 0,
    due_today: 1,
    due_soon: 2,
    upcoming: 3,
  };

  paymentDueItems.sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    return toDateValue(a.due_date) - toDateValue(b.due_date);
  });

  const projectsWithMetrics: ProjectListItem[] = projects.map((project) => {
    const base = metricsByProjectId.get(project.id) ?? {
      total_products: 0,
      bought_products: 0,
      spent_budget: 0,
      payment_overdue_count: 0,
      payment_due_today_count: 0,
      payment_due_tomorrow_count: 0,
    };

    const budgetAmount = Number(project.budget_amount ?? 0);
    const spentBudget = Number(base.spent_budget ?? 0);
    const remainingBudget = budgetAmount - spentBudget;
    const remainingProducts = Math.max(0, base.total_products - base.bought_products);

    return {
      ...project,
      total_products: base.total_products,
      bought_products: base.bought_products,
      remaining_products: remainingProducts,
      spent_budget: spentBudget,
      remaining_budget: remainingBudget,
      payment_overdue_count: base.payment_overdue_count,
      payment_due_today_count: base.payment_due_today_count,
      payment_due_tomorrow_count: base.payment_due_tomorrow_count,
    };
  });

  projectsWithMetrics.sort((a, b) => {
    if (b.payment_overdue_count !== a.payment_overdue_count) {
      return b.payment_overdue_count - a.payment_overdue_count;
    }

    if (b.payment_due_today_count !== a.payment_due_today_count) {
      return b.payment_due_today_count - a.payment_due_today_count;
    }

    if (b.payment_due_tomorrow_count !== a.payment_due_tomorrow_count) {
      return b.payment_due_tomorrow_count - a.payment_due_tomorrow_count;
    }

    if (b.remaining_products !== a.remaining_products) {
      return b.remaining_products - a.remaining_products;
    }

    const aHasDeadline = Boolean(a.deadline);
    const bHasDeadline = Boolean(b.deadline);
    if (aHasDeadline !== bHasDeadline) {
      return aHasDeadline ? -1 : 1;
    }

    if (a.deadline && b.deadline) {
      return toDateValue(a.deadline) - toDateValue(b.deadline);
    }

    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });

  let spentBudget = 0;
  let totalBudget = 0;
  let totalProducts = 0;
  let totalBoughtProducts = 0;
  let totalRemainingProducts = 0;
  for (const project of projectsWithMetrics) {
    spentBudget += project.spent_budget;
    totalBudget += Number(project.budget_amount ?? 0);
    totalProducts += project.total_products;
    totalBoughtProducts += project.bought_products;
    totalRemainingProducts += project.remaining_products;
  }
  const dashboard: ProjectsDashboardSummary = {
    active_projects: projectsWithMetrics.length,
    total_products: totalProducts,
    bought_products: totalBoughtProducts,
    remaining_products: totalRemainingProducts,
    spent_budget: spentBudget,
    total_budget: totalBudget,
  };

  return <ProjectList projects={projectsWithMetrics} dashboard={dashboard} paymentDueItems={paymentDueItems.slice(0, 5)} />;
}
