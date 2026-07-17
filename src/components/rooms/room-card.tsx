"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { RoomActions } from "@/components/rooms/room-actions";
import { formatCurrency } from "@/lib/utils";
import type { RoomWithBudget } from "@/lib/rooms/types";

export function RoomCard({ projectId, room, currency }: { projectId: string; room: RoomWithBudget; currency: string }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigateToRoom = () => {
    router.push(`/projects/${projectId}/rooms/${room.id}`);
  };

  return (
    <article
      className="relative rounded-2xl border bg-card p-5 transition hover:border-[#d6c3a6]/50 hover:shadow-sm"
      role="button"
      tabIndex={0}
      onClick={navigateToRoom}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateToRoom();
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Room</p>
          <h2 className="mt-2 truncate text-xl font-semibold tracking-[-0.02em]">{room.name}</h2>
          {room.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{room.description}</p>
          ) : null}
        </div>

        <div className="flex items-start gap-3 pointer-events-auto">
          <div className="text-right">
            <p className="text-sm font-medium">{room.product_count} {room.product_count === 1 ? "Product" : "Products"}</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(room.spent_budget, currency)}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl border bg-background text-muted-foreground transition-colors hover:border-[#d6c3a6] hover:text-foreground">
              <ArrowUpRight className="size-4" />
            </div>
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen((current) => !current);
                }}
                className="grid h-9 w-9 place-items-center rounded-full border bg-background text-sm text-muted-foreground transition hover:border-[#d6c3a6] hover:text-foreground"
              >
                •••
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-2xl border bg-card p-3 shadow-sm">
                  <RoomActions projectId={projectId} room={room} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="rounded-xl border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Products</p>
          <p className="mt-1 text-sm font-medium">{room.product_count}</p>
        </div>
        <div className="rounded-xl border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="mt-1 text-sm font-medium">{formatCurrency(room.spent_budget, currency)}</p>
        </div>
        <div className="rounded-xl border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Purchased / Remaining</p>
          <p className="mt-1 text-sm font-medium">{room.bought_product_count} / {room.remaining_product_count}</p>
        </div>
      </div>
    </article>
  );
}
