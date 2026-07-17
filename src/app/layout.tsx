import type { Metadata } from "next";
import { Toaster } from "sonner";
import { WorkspaceLayout } from "@/components/navigation/workspace-layout";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blux Interior",
    template: "%s · Blux Interior",
  },
  description: "Private interior design and procurement workspace.",
};

async function getOverduePaymentCount() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return 0;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: projects } = await supabase.from("projects").select("id").eq("owner_id", user.id);
    const projectIds = (projects ?? []).map((project) => project.id);
    if (projectIds.length === 0) return 0;

    const { data: rooms } = await supabase.from("rooms").select("id").in("project_id", projectIds);
    const roomIds = (rooms ?? []).map((room) => room.id);
    if (roomIds.length === 0) return 0;

    const { data: roomProducts } = await supabase.from("room_products").select("id").in("room_id", roomIds);
    const productIds = (roomProducts ?? []).map((product) => product.id);
    if (productIds.length === 0) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("room_product_payments")
      .select("id", { head: true, count: "exact" })
      .is("paid_at", null)
      .lt("due_date", today)
      .in("product_id", productIds);

    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const overdueCount = await getOverduePaymentCount();

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <WorkspaceLayout overdueCount={overdueCount}>{children}</WorkspaceLayout>
        <Toaster closeButton position="top-right" richColors theme="light" />
      </body>
    </html>
  );
}
