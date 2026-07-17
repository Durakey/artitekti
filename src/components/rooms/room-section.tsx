"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RoomForm } from "@/components/rooms/room-form";
import { RoomList } from "@/components/rooms/room-list";
import type { RoomWithBudget } from "@/lib/rooms/types";

export function RoomSection({ projectId, rooms, currency }: { projectId: string; rooms: RoomWithBudget[]; currency: string }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section className="mt-10 rounded-2xl border bg-card p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Rooms</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">Room planning</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Add rooms and begin designing interiors for this project.</p>
        </div>
        <Button variant="outline" type="button" onClick={() => setIsFormOpen(true)}>
          + Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="block w-full rounded-2xl border border-dashed bg-background p-8 text-left transition hover:border-[#d6c3a6]/50"
        >
          <div>
            <p className="text-sm text-muted-foreground">Rooms</p>
            <h3 className="mt-2 text-xl font-semibold">Add your first room</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Click to start room planning for this project.</p>
          </div>
        </button>
      ) : (
        <RoomList projectId={projectId} rooms={rooms} currency={currency} />
      )}

      {isFormOpen && <RoomForm projectId={projectId} onClose={() => setIsFormOpen(false)} />}
    </section>
  );
}
