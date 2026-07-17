import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { resolveSelectedOption } from "@/lib/rooms/purchase";
import { formatCurrency } from "@/lib/utils";
import type { PaymentDueItem, Project } from "@/lib/projects/types";

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

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, currency, budget_amount")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

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

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const roomProductById = new Map(roomProducts.map((product) => [product.id, product]));

  const projectBudgets = new Map<string, { budget: number; spent: number; remaining: number }>();
  for (const project of projects) {
    projectBudgets.set(project.id, {
      budget: Number(project.budget_amount ?? 0),
      spent: 0,
      remaining: Number(project.budget_amount ?? 0),
    });
  }

  for (const payment of payments) {
    if (!payment.paid_at) continue;

    const product = roomProductById.get(payment.product_id);
    if (!product) continue;

    const productOptions = optionsByProductId.get(product.id) ?? [];
    const selectedOption = resolveSelectedOption(productOptions, product.selected_option_id);
    if (!selectedOption) continue;

    const projectId = roomToProjectId.get(product.room_id);
    if (!projectId) continue;

    const budget = projectBudgets.get(projectId);
    if (!budget) continue;

    budget.spent += Number(payment.amount ?? 0);
  }

  for (const budget of projectBudgets.values()) {
    budget.remaining = Math.max(0, budget.budget - budget.spent);
  }

  const financialSummary = Array.from(projectBudgets.values()).reduce(
    (summary, budget) => ({
      budget: summary.budget + budget.budget,
      spent: summary.spent + budget.spent,
      remaining: summary.remaining + budget.remaining,
    }),
    { budget: 0, spent: 0, remaining: 0 },
  );

  const projectBudgetList = projects.map((project) => {
    const budget = projectBudgets.get(project.id) ?? { budget: 0, spent: 0, remaining: 0 };
    return {
      id: project.id,
      name: project.name,
      currency: project.currency,
      budget: budget.budget,
      spent: budget.spent,
      remaining: budget.remaining,
    };
  });

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

  const overdue = paymentDueItems.filter((item) => item.priority === "overdue");
  const dueToday = paymentDueItems.filter((item) => item.priority === "due_today");
  const dueSoon = paymentDueItems.filter((item) => item.priority === "due_soon");
  const upcoming = paymentDueItems.filter((item) => item.priority === "upcoming");

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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <header className="mb-10 border-b pb-8">
        <div>
          <p className="text-sm text-muted-foreground">Payments</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Financial overview</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Track budget movement and act on overdue and upcoming payment commitments.</p>
        </div>
      </header>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total Budget" value={formatCurrency(financialSummary.budget)} />
          <SummaryCard label="Spent" value={formatCurrency(financialSummary.spent)} />
          <SummaryCard label="Remaining" value={formatCurrency(financialSummary.remaining)} />
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Budget per Project</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Project budgets</h2>
          </div>
          <p className="text-sm text-muted-foreground">{projectBudgetList.length} projects</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projectBudgetList.map((project) => (
            <div key={project.id} className="rounded-2xl border bg-card px-5 py-4">
              <p className="text-base font-semibold">{project.name}</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Budget</span>
                  <span className="font-semibold text-foreground">{formatCurrency(project.budget, project.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Spent</span>
                  <span className="font-semibold text-foreground">{formatCurrency(project.spent, project.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Remaining</span>
                  <span className="font-semibold text-foreground">{formatCurrency(project.remaining, project.currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PaymentSection title="Overdue Payments" items={overdue} emptyMessage="No overdue payments." />
      <PaymentSection title="Due Today" items={dueToday} emptyMessage="No payments due today." />
      <PaymentSection title="Due Soon" items={dueSoon} emptyMessage="No payments due soon." />
      <PaymentSection title="Upcoming" items={upcoming} emptyMessage="No upcoming payments." />
    </main>
  );
}

function PaymentSection({ title, items, emptyMessage }: { title: string; items: PaymentDueItem[]; emptyMessage: string }) {
  return (
    <section className="mt-10 space-y-3">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="text-sm text-muted-foreground">{items.length} items</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-8 text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Link
              key={item.payment_id}
              href={`/projects/${item.project_id}/rooms/${item.room_id}?product=${item.product_id}`}
              className="flex items-start justify-between gap-4 rounded-2xl border bg-card px-5 py-4 transition hover:border-[#d6c3a6]/50"
            >
              <div className="min-w-0">
                <p className="text-xl font-semibold">{formatCurrency(item.amount, item.currency)}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.project_name} · {item.room_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.store_name} · Due {formatDate(item.due_date)}</p>
              </div>
              {(() => {
                const badge = getPaymentBadge(item.priority);
                return <span className={badge.className}>{badge.icon} {badge.label}</span>;
              })()}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}
