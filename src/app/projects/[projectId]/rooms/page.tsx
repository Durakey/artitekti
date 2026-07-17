import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { RoomActions } from "@/components/rooms/room-actions";

export const metadata = {
  title: "Room details",
};

export default async function RoomDetailPage({ params }: { params: Promise<{ projectId: string; roomId: string }> }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    notFound();
  }

  const { projectId, roomId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

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

  const { data: images } = await supabase
    .from("room_inspiration_images")
    .select("id, room_id, image_url, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  await supabase
    .from("room_products")
    .select("id, room_id, name, quantity, created_at, updated_at")
    .eq("room_id", roomId);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
      <header className="mb-10 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d6c3a6]">Room</p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">{room.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Interior inspiration and product planning for this room.</p>
        </div>
        <div className="grid gap-3 sm:text-right">
          <p className="text-sm text-muted-foreground">Room ID: {room.id}</p>
          <p className="text-sm text-muted-foreground">Project: {projectId}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 justify-end">
            <RoomActions projectId={projectId} room={room} />
          </div>
        </div>
      </header>

      <section className="space-y-6 rounded-3xl border border-white/10 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#d6c3a6]">Interior Inspiration</p>
            <h2 className="mt-3 text-2xl font-medium">Moodboard</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Reference photos, inspiration and design direction for this room.</p>
          </div>
          <button className="inline-flex h-10 items-center justify-center rounded-xl bg-[#d6c3a6] px-4 text-sm font-medium text-black transition hover:bg-[#e3d2b9]" type="button">Upload image</button>
        </div>

        {images && images.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <div key={image.id} className="relative h-56 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0f]">
                <Image src={image.image_url} alt={`Inspiration image for ${room.name}`} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border-dashed border border-white/10 bg-[#0b0b0f] p-8 text-center">
            <p className="text-sm leading-6 text-muted-foreground">Add your first inspiration image.</p>
            <button className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#d6c3a6] px-4 text-sm font-medium text-black transition hover:bg-[#e3d2b9]" type="button">Upload image</button>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-white/10 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#d6c3a6]">Products</p>
            <h2 className="mt-3 text-2xl font-medium">Products</h2>
          </div>
          <p className="text-sm text-muted-foreground">Product catalog will connect here.</p>
        </div>
        <div className="mt-6 rounded-3xl border-dashed border border-white/10 bg-[#0b0b0f] p-8 text-center">
          <p className="text-sm leading-6 text-muted-foreground">Product listing is coming soon.</p>
        </div>
      </section>
    </main>
  );
}
