import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isPurchasedFromAmounts, resolveSelectedOption, sumPaidPayments } from "@/lib/rooms/purchase";
import { formatCurrency } from "@/lib/utils";
import type { PaymentDueItem, Project, ProjectListMetrics } from "@/lib/projects/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

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
  currency: string | null;
  store_name: string;
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

const formatDate = (value: string | null) => {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
};

const getPaymentBadge = (priority: PaymentDueItem["priority"]) => {
  switch (priority) {
    case "overdue":
      return { icon: "🔴", label: "OVERDUE", className: "rounded-full border border-[#fca5a5] bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]" };
    case "due_today":
      return { icon: "🟠", label: "DUE TODAY", className: "rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#b45309]" };
    case "due_soon":
      return { icon: "🟠", label: "DUE SOON", className: "rounded-full bg-[#ffedd5] px-3 py-1 text-xs font-semibold text-[#c2410c]" };
    default:
      return { icon: "🟢", label: "UPCOMING", className: "rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#15803d]" };
  }
};

export default async function TodayPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, client_name, location, category, status, deadline, completion_percent, budget_amount, currency, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const projects = (projectsData ?? []) as Project[];
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const projectIds = projects.map((project) => project.id);

  const { data: roomsData } = projectIds.length
    ? await supabase.from("rooms").select("id, project_id, name").in("project_id", projectIds)
    : { data: [] };

  const rooms = (roomsData ?? []) as RoomRow[];
  const roomToProjectId = new Map(rooms.map((room) => [room.id, room.project_id]));
  const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));
  const roomIds = rooms.map((room) => room.id);

  const { data: roomProductsData } = roomIds.length
    ? await supabase.from("room_products").select("id, room_id, selected_option_id").in("room_id", roomIds)
    : { data: [] };

  const roomProducts = (roomProductsData ?? []) as RoomProductRow[];
  const productIds = roomProducts.map((product) => product.id);

  const { data: optionsData } = productIds.length
    ? await supabase
        .from("product_options")
        .select("id, product_id, price, currency, store_name, is_selected")
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
  const today = new Date().toISOString().slice(0, 10);

  const projectMetrics = new Map<string, ProjectListMetrics>();
  for (const project of projects) {
    projectMetrics.set(project.id, {
      total_products: 0,
      bought_products: 0,
      remaining_products: 0,
      spent_budget: 0,
      remaining_budget: 0,
      payment_overdue_count: 0,
      payment_due_today_count: 0,
      payment_due_tomorrow_count: 0,
    });
  }

  for (const product of roomProducts) {
    const projectId = roomToProjectId.get(product.room_id);
    if (!projectId) continue;

    const metrics = projectMetrics.get(projectId);
    if (!metrics) continue;

    metrics.total_products += 1;
    const productOptions = optionsByProductId.get(product.id) ?? [];
    const selectedOption = resolveSelectedOption(productOptions, product.selected_option_id);
    const paidAmount = selectedOption ? sumPaidPayments(paymentsByProductId.get(product.id) ?? []) : 0;
    metrics.spent_budget += paidAmount;
    if (selectedOption && isPurchasedFromAmounts(Number(selectedOption.price ?? 0), paidAmount)) {
      metrics.bought_products += 1;
    }
  }

  for (const [, metrics] of projectMetrics.entries()) {
    metrics.remaining_products = Math.max(0, metrics.total_products - metrics.bought_products);
  }

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
        productOptions.find((option) => option.id === product.selected_option_id) ||
        productOptions.find((option) => option.is_selected) ||
        null;

      const dueValue = toDateValue(payment.due_date);
      const todayValue = toDateValue(today);
      const daysDiff = Math.round((dueValue - todayValue) / (1000 * 60 * 60 * 24));
      const priority: PaymentDueItem["priority"] = daysDiff < 0 ? "overdue" : daysDiff === 0 ? "due_today" : daysDiff <= 7 ? "due_soon" : "upcoming";

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
      };
    })
    .filter((item): item is PaymentDueItem => item !== null)
    .sort((a, b) => {
      const rank = { overdue: 0, due_today: 1, due_soon: 2, upcoming: 3 } as const;
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
      return toDateValue(a.due_date) - toDateValue(b.due_date);
    });

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

  const todayTasks = paymentDueItems.filter((item) => item.priority !== "upcoming").slice(0, 5);
  const paymentsDue = paymentDueItems.slice(0, 6);
  const recentProjects = projects.slice(0, 3);
  const projectsNeedingAttention = projects
    .map((project) => {
      const metrics = projectMetrics.get(project.id);
      if (!metrics) return null;

      const openPayments = paymentDueItems.filter((item) => item.project_id === project.id).length;
      if (metrics.remaining_products <= 0 && openPayments === 0) return null;

      return {
        id: project.id,
        name: project.name,
        location: project.location,
        remainingProducts: metrics.remaining_products,
        openPayments,
      };
    })
    .filter((project): project is { id: string; name: string; location: string | null; remainingProducts: number; openPayments: number } => project !== null)
    .slice(0, 5);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <header className="mb-10 border-b pb-8">
        <div>
          <p className="text-sm text-muted-foreground">Today</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">What should I do today?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Focus on urgent tasks, upcoming payments, and projects that need movement.</p>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s Tasks</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Immediate actions</h2>
          </div>
          <p className="text-sm text-muted-foreground">{todayTasks.length} items</p>
        </div>

        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card px-6 py-8 text-sm text-muted-foreground">No urgent actions for today.</div>
        ) : (
          <div className="space-y-2.5">
            {todayTasks.map((item) => {
              const badge = getPaymentBadge(item.priority);
              return (
                <Link
                  key={item.payment_id}
                  href={`/projects/${item.project_id}/rooms/${item.room_id}?product=${item.product_id}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border bg-card px-5 py-4 transition hover:border-[#d6c3a6]/50"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-semibold">{formatCurrency(item.amount, item.currency)}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.project_name} · {item.room_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.store_name}</p>
                  </div>
                  <span className={badge.className}>{badge.icon} {badge.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10 space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Payments Due</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Upcoming payments</h2>
          </div>
          <p className="text-sm text-muted-foreground">{paymentsDue.length} items</p>
        </div>

        {paymentsDue.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card px-6 py-8 text-sm text-muted-foreground">No payments due in the next few days.</div>
        ) : (
          <div className="space-y-2.5">
            {paymentsDue.map((item) => {
              const badge = getPaymentBadge(item.priority);
              return (
                <Link
                  key={item.payment_id}
                  href={`/projects/${item.project_id}/rooms/${item.room_id}?product=${item.product_id}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border bg-card px-5 py-4 transition hover:border-[#d6c3a6]/50"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-semibold">{formatCurrency(item.amount, item.currency)}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.project_name} · {item.room_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Due {formatDate(item.due_date)}</p>
                  </div>
                  <span className={badge.className}>{badge.icon} {badge.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10 space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Projects Needing Attention</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Where to focus next</h2>
          </div>
          <p className="text-sm text-muted-foreground">{projectsNeedingAttention.length} projects</p>
        </div>

        {projectsNeedingAttention.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card px-6 py-8 text-sm text-muted-foreground">All projects are currently in a good state.</div>
        ) : (
          <div className="space-y-2.5">
            {projectsNeedingAttention.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="flex items-start justify-between gap-4 rounded-2xl border bg-card px-5 py-4 transition hover:border-[#d6c3a6]/50">
                <div>
                  <p className="text-lg font-semibold">{project.name}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{project.location ?? "No location"}</p>
                </div>
                <p className="text-sm text-muted-foreground">{project.remainingProducts} remaining · {project.openPayments} payments</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 space-y-3 pb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Recent Projects</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Continue where you left off</h2>
          </div>
          <p className="text-sm text-muted-foreground">{recentProjects.length} projects</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-2xl border bg-card px-5 py-4 transition hover:border-[#d6c3a6]/50"
            >
              <p className="text-sm text-muted-foreground">{project.client_name}</p>
              <h3 className="mt-1.5 text-xl font-semibold">{project.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.location ?? "No location"}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
