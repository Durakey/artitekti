import Link from "next/link";
import { ArrowUpRight, FolderKanban, MapPin } from "lucide-react";

import { ProjectForm } from "@/components/projects/project-form";
import { labels, projectCategories } from "@/lib/projects/constants";
import { formatCurrency } from "@/lib/utils";
import type { PaymentDueItem, ProjectListItem, ProjectsDashboardSummary } from "@/lib/projects/types";

const categoryLabels = labels(projectCategories);

const formatAmount = (amount: number, currency?: string | null) => {
  return formatCurrency(amount, currency ?? "EUR");
};

export function ProjectList({ projects, dashboard, paymentDueItems }: { projects: ProjectListItem[]; dashboard: ProjectsDashboardSummary; paymentDueItems: PaymentDueItem[] }) {
  void dashboard;
  void paymentDueItems;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <header className="flex items-end justify-between gap-4 border-b pb-8">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Projects</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Browse active workspaces and open the project you want to continue.</p>
        </div>
        <ProjectForm />
      </header>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="mt-8 grid gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="group block rounded-2xl border bg-card px-6 py-5 transition hover:border-[#d6c3a6]/50 hover:shadow-sm">
              <article className="flex items-start justify-between gap-5">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{categoryLabels[project.category]}</span>
                  </div>
                  <h2 className="truncate text-2xl font-semibold tracking-[-0.02em]">{project.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    {project.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4" />
                        {project.location}
                      </span>
                    ) : null}
                    <span>{project.total_products} products</span>
                    <span>{project.remaining_products} remaining</span>
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    {formatAmount(project.spent_budget, project.currency)} / {formatAmount(Number(project.budget_amount ?? 0), project.currency)}
                  </p>
                </div>

                <span className="grid size-9 shrink-0 place-items-center rounded-xl border bg-background text-muted-foreground transition group-hover:border-[#d6c3a6] group-hover:text-foreground">
                  <ArrowUpRight className="size-4" />
                </span>
              </article>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 grid min-h-80 place-items-center rounded-2xl border border-dashed bg-card px-6 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
          <FolderKanban className="size-5 text-[#d6c3a6]" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Start with a project</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Add your first project to bring client details, budget, and room planning into one workspace.</p>
        <div className="mt-5">
          <ProjectForm />
        </div>
      </div>
    </div>
  );
}
