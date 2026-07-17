import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { isPurchasedFromAmounts, resolveSelectedOption, sumPaidPayments } from "@/lib/rooms/purchase";
import { labels, projectCategories } from "@/lib/projects/constants";
import type { RoomWithBudget } from "@/lib/rooms/types";
import { RoomSection } from "@/components/rooms/room-section";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";

const categoryLabels = labels(projectCategories);

export const metadata = {
  title: "Project details",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    notFound();
  }

  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, owner_id, name, client_name, client_email, client_phone, location, google_maps_url, category, custom_category, start_date, deadline, completion_percent, budget_amount, currency, cover_image_path, description, notes, created_at, updated_at"
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Project load error:", error);
  }

  if (!project || project.owner_id !== user.id) {
    notFound();
  }

  const { data: roomsData, error: roomsError } = await supabase
    .from("rooms")
    .select("id, project_id, name, description, sort_order, created_at, updated_at, room_products(id, selected_option_id)")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (roomsError) {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <pre className="rounded-3xl border border-red-500 bg-[#1f1414] p-6 text-sm text-red-200">
          {JSON.stringify(roomsError, null, 2)}
        </pre>
      </main>
    );
  }

  type RoomLoadResult = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    room_products: Array<{ id: string; selected_option_id: string | null }>;
  };

  const rooms = ((roomsData ?? []) as RoomLoadResult[]).map((room) => ({
    ...room,
    product_count: room.room_products.length,
  }));

  const productIds = rooms.flatMap((room) => room.room_products.map((product) => product.id));

  const { data: optionsData } = productIds.length
    ? await supabase
        .from("product_options")
        .select("id, product_id, price, is_selected")
        .in("product_id", productIds)
    : { data: [] };

  const options = (optionsData ?? []) as Array<{ id: string; product_id: string; price: number | string | null; is_selected: boolean }>;
  const optionsByProductId = new Map<string, typeof options>();
  for (const option of options) {
    const existing = optionsByProductId.get(option.product_id) ?? [];
    existing.push(option);
    optionsByProductId.set(option.product_id, existing);
  }
  const { data: paymentsData } = productIds.length
    ? await supabase
        .from("room_product_payments")
        .select("id, product_id, amount, paid_at")
        .in("product_id", productIds)
    : { data: [] };

  const payments = (paymentsData ?? []) as Array<{ id: string; product_id: string; amount: number | string; paid_at: string | null }>;
  const paymentsByProductId = new Map<string, typeof payments>();
  for (const payment of payments) {
    const existing = paymentsByProductId.get(payment.product_id) ?? [];
    existing.push(payment);
    paymentsByProductId.set(payment.product_id, existing);
  }

  const roomsWithMetrics = (rooms as RoomLoadResult[]).map((room) => {
    const totalProducts = room.room_products.length;
    const purchasedProducts = room.room_products.filter((product) => {
      const selectedOption = resolveSelectedOption(optionsByProductId.get(product.id) ?? [], product.selected_option_id);
      const paidAmount = selectedOption ? sumPaidPayments(paymentsByProductId.get(product.id) ?? []) : 0;
      return selectedOption && isPurchasedFromAmounts(Number(selectedOption.price ?? 0), paidAmount);
    }).length;
    const remainingProducts = Math.max(0, totalProducts - purchasedProducts);
    const spentBudget = room.room_products.reduce((sum, product) => {
      const selectedOption = resolveSelectedOption(optionsByProductId.get(product.id) ?? [], product.selected_option_id);
      if (!selectedOption) return sum;
      return sum + sumPaidPayments(paymentsByProductId.get(product.id) ?? []);
    }, 0);

    return {
      ...room,
      product_count: totalProducts,
      bought_product_count: purchasedProducts,
      remaining_product_count: remainingProducts,
      spent_budget: spentBudget,
      remaining_budget: null,
    } as RoomWithBudget;
  });

  roomsWithMetrics.sort((a, b) => {
    if (b.remaining_product_count !== a.remaining_product_count) {
      return b.remaining_product_count - a.remaining_product_count;
    }
    if (b.spent_budget !== a.spent_budget) {
      return b.spent_budget - a.spent_budget;
    }
    return a.name.localeCompare(b.name);
  });

  const totalProducts = roomsWithMetrics.reduce((sum, room) => sum + room.product_count, 0);
  const totalProjectSpent = roomsWithMetrics.reduce((sum, room) => sum + room.spent_budget, 0);
  const totalProjectBudget = Number(project.budget_amount ?? 0);
  const remainingProjectBudget = Math.max(0, totalProjectBudget - totalProjectSpent);
  const budgetProgress = totalProjectBudget > 0 ? Math.min(1, totalProjectSpent / totalProjectBudget) : 0;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[#d6c3a6]"
        >
          <ChevronLeft className="size-4" />
          All Projects
        </Link>
      </div>

      <header className="mb-8 flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Project</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">{project.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Manage rooms, budgets, and client details in one focused view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProjectForm
            project={{
              id: project.id,
              name: project.name,
              clientName: project.client_name,
              clientEmail: project.client_email ?? undefined,
              clientPhone: project.client_phone ?? undefined,
              location: project.location ?? undefined,
              category: project.category,
              customCategory: project.custom_category ?? undefined,
              budget: String(project.budget_amount),
              currency: project.currency,
              startDate: project.start_date ?? undefined,
              deadline: project.deadline ?? undefined,
              description: project.description ?? undefined,
            }}
            mode="edit"
            triggerLabel="Edit project"
          />
          <ProjectDeleteButton projectId={project.id} />
        </div>
      </header>

      <section className="space-y-5 rounded-2xl border bg-card p-6">
        <div className="rounded-2xl bg-muted p-5">
          <p className="text-sm text-muted-foreground">Budget</p>
          <p className="mt-2 text-4xl font-semibold tracking-[-0.02em]">
            {formatCurrency(totalProjectSpent, project.currency)}
            {" / "}
            {formatCurrency(totalProjectBudget, project.currency)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Remaining {formatCurrency(remainingProjectBudget, project.currency)}</p>
          <p className="mt-4 text-sm text-muted-foreground">{roomsWithMetrics.length} rooms · {totalProducts} products</p>
        </div>

        {project.description ? (
          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
          </div>
        ) : null}

        <div className="rounded-2xl border bg-background p-5">
          <h2 className="text-lg font-semibold">Project Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
            {project.client_name ? (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Client</p>
                <p className="mt-1.5">{project.client_name}</p>
              </div>
            ) : null}
            {project.client_email ? (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Email</p>
                <p className="mt-1.5">{project.client_email}</p>
              </div>
            ) : null}
            {project.client_phone ? (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Phone</p>
                <p className="mt-1.5">{project.client_phone}</p>
              </div>
            ) : null}
            {project.location ? (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Location</p>
                <p className="mt-1.5">{project.location}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Category</p>
              <p className="mt-1.5">{project.category === "custom" ? project.custom_category ?? "Custom" : categoryLabels[project.category]}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Project ID</p>
              <p className="mt-1.5 break-all">{project.id}</p>
            </div>
            {project.created_at ? (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[#d6c3a6]">Created Date</p>
                <p className="mt-1.5">{new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${project.created_at}`))}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <RoomSection projectId={projectId} rooms={roomsWithMetrics} currency={project.currency} />
    </main>
  );
}
