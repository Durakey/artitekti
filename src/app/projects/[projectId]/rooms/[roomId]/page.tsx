import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { RoomActions } from "@/components/rooms/room-actions";
import { RoomProductSection } from "@/components/products/room-product-section";
import type { RoomProduct, RoomProductOption, RoomProductPayment } from "@/lib/rooms/types";

export const metadata = {
  title: "Room details",
};

function normalizeRoomProduct(row: Record<string, unknown>): RoomProduct {
  const rawName = typeof row.name === "string" ? row.name : typeof row.product_name === "string" ? row.product_name : "Untitled product";
  const name = rawName.trim() || "Untitled product";

  return {
    id: String(row.id ?? ""),
    room_id: String(row.room_id ?? ""),
    name,
    category: typeof row.category === "string" ? row.category : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    quantity: Number(row.quantity ?? 1),
    cover_image_url: typeof row.cover_image_url === "string" ? row.cover_image_url : null,
    selected_option_id: typeof row.selected_option_id === "string" ? row.selected_option_id : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export default async function RoomDetailPage({ params }: { params: Promise<{ projectId: string; roomId: string }> }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    notFound();
  }

  const { projectId, roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("Project load error:", projectError);
  }

  if (!project || project.owner_id !== user.id) {
    notFound();
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, project_id, name, description, created_at, updated_at")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    console.error("Room load error:", roomError);
  }

  if (!room || room.project_id !== projectId) {
    notFound();
  }

  const { data: productsRaw, error: productsError } = await supabase
    .from("room_products")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (productsError) {
    console.error("Product load error:", productsError);
  }

  const products = (productsRaw ?? []).map((product) => normalizeRoomProduct(product as Record<string, unknown>));
  const productIds = products.map((product) => product.id);
  const { data: options, error: optionsError } = productIds.length
    ? await supabase
        .from("product_options")
        .select("id, product_id, store_name, price, currency, location, notes, cover_image_url, is_selected, created_at, updated_at")
        .in("product_id", productIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (optionsError) {
    console.error("Options load error:", optionsError);
  }

  const { data: paymentsData, error: paymentsError } = productIds.length
    ? await supabase
        .from("room_product_payments")
        .select("id, product_id, amount, due_date, paid_at, created_at, updated_at")
        .in("product_id", productIds)
        .order("due_date", { ascending: true })
    : { data: [], error: null };

  if (paymentsError) {
    console.error("Payments load error:", paymentsError);
  }

  const productsWithSelections = products as RoomProduct[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 sm:px-10 lg:px-14">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[#d6c3a6]"
        >
          <ChevronLeft className="size-4" />
          Project
        </Link>
      </div>

      <header className="mb-8 flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Room</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">{room.name}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Manage products and payment tracking for this room.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Project {project.name}</p>
          <div className="flex flex-wrap items-center gap-3">
            <RoomActions projectId={projectId} room={room} />
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Room Notes</p>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{room.description ?? "No room description yet."}</p>
        </div>
      </section>

      <RoomProductSection
        projectId={projectId}
        roomId={roomId}
        roomName={room.name}
        products={productsWithSelections}
        options={(options ?? []) as RoomProductOption[]}
        payments={(paymentsData ?? []) as RoomProductPayment[]}
      />
    </main>
  );
}
