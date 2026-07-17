import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isPurchasedFromAmounts, resolveSelectedOption, sumPaidPayments } from "@/lib/rooms/purchase";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "@/lib/projects/types";

type RoomRow = {
  id: string;
  project_id: string;
};

type RoomProductRow = {
  id: string;
  room_id: string;
  selected_option_id: string | null;
};

type ProductPaymentRow = {
  id: string;
  product_id: string;
  amount: number | string;
  due_date: string;
  paid_at: string | null;
};

type ProductOptionRow = {
  id: string;
  product_id: string;
  price: number | string | null;
  currency: string | null;
  is_selected: boolean;
};

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, currency, budget_amount, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const projects = (projectsData ?? []) as Project[];
  const projectIds = projects.map((project) => project.id);

  const { data: roomsData } = projectIds.length
    ? await supabase.from("rooms").select("id, project_id").in("project_id", projectIds)
    : { data: [] };

  const rooms = (roomsData ?? []) as RoomRow[];
  const roomToProjectId = new Map(rooms.map((room) => [room.id, room.project_id]));
  const roomIds = rooms.map((room) => room.id);

  const { data: roomProductsData } = roomIds.length
    ? await supabase.from("room_products").select("id, room_id, selected_option_id").in("room_id", roomIds)
    : { data: [] };

  const roomProducts = (roomProductsData ?? []) as RoomProductRow[];
  const productIds = roomProducts.map((product) => product.id);

  const { data: optionsData } = productIds.length
    ? await supabase
        .from("product_options")
        .select("id, product_id, price, currency, is_selected")
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

  const projectMetrics = new Map(
    projects.map((project) => [project.id, { productCount: 0, boughtCount: 0, spentBudget: 0, remainingBudget: 0 }]),
  );

  for (const product of roomProducts) {
    const projectId = roomToProjectId.get(product.room_id);
    if (!projectId) continue;

    const metrics = projectMetrics.get(projectId);
    if (!metrics) continue;

    metrics.productCount += 1;
    const productOptions = optionsByProductId.get(product.id) ?? [];
    const selectedOption = resolveSelectedOption(productOptions, product.selected_option_id);
    const paidAmount = selectedOption ? sumPaidPayments(paymentsByProductId.get(product.id) ?? []) : 0;
    metrics.spentBudget += paidAmount;
    if (selectedOption && isPurchasedFromAmounts(Number(selectedOption.price ?? 0), paidAmount)) {
      metrics.boughtCount += 1;
    }
  }

  const projectsWithMetrics = projects.map((project) => {
    const metrics = projectMetrics.get(project.id) ?? { productCount: 0, boughtCount: 0, spentBudget: 0, remainingBudget: 0 };
    return {
      ...project,
      ...metrics,
      remainingBudget: Number(project.budget_amount ?? 0) - metrics.spentBudget,
    };
  });

  const summary = {
    projects: projects.length,
    rooms: rooms.length,
    products: roomProducts.length,
    bought: Array.from(projectMetrics.values()).reduce((sum, metrics) => sum + metrics.boughtCount, 0),
    spent: projectsWithMetrics.reduce((sum, project) => sum + project.spentBudget, 0),
  };

  const topProjects = [...projectsWithMetrics]
    .sort((a, b) => b.spentBudget - a.spentBudget)
    .slice(0, 3);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d6c3a6]">Reports</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Project performance</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">High-level metrics across your workspace and top projects by spend.</p>
        </div>
        <div className="grid gap-2 text-sm text-muted-foreground sm:text-right">
          <p>{summary.projects} projects</p>
          <p>{summary.products} products</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <ReportCard label="Projects" value={String(summary.projects)} />
        <ReportCard label="Rooms" value={String(summary.rooms)} />
        <ReportCard label="Products" value={String(summary.products)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-white/10 bg-card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-[#d6c3a6]">Spend summary</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SummaryTile label="Purchased products" value={String(summary.bought)} />
            <SummaryTile label="Total spend" value={formatCurrency(summary.spent)} />
            <SummaryTile label="Average spend per project" value={formatCurrency(Math.round(summary.spent / Math.max(1, summary.projects)))} />
            <SummaryTile label="Average products per project" value={String(Math.round(summary.products / Math.max(1, summary.projects)))} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#111114] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#d6c3a6]">Top projects</p>
            <div className="mt-4 space-y-3">
              {topProjects.map((project) => (
                <div key={project.id} className="rounded-3xl border border-white/10 bg-card p-4">
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(project.spentBudget, project.currency)} spent</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#d6c3a6]">Remaining budget {formatCurrency(Math.max(0, project.remainingBudget), project.currency)}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111114] p-6">
      <p className="text-xs uppercase tracking-[0.14em] text-[#d6c3a6]">{label}</p>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0b0b0f] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[#d6c3a6]">{label}</p>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{value}</p>
    </div>
  );
}
