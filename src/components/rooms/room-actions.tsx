"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { deleteRoom, type RoomActionState } from "@/app/projects/[projectId]/rooms/actions";
import { RoomForm } from "@/components/rooms/room-form";
import { Button } from "@/components/ui/button";
import type { Room } from "@/lib/rooms/types";

type RoomActionsProps = {
  projectId: string;
  room: Room;
};

const initialState: RoomActionState = {};

export function RoomActions({ projectId, room }: RoomActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteRoom, initialState);

  useEffect(() => {
    if (!state.success) return;
    router.push(`/projects/${projectId}`);
  }, [state.success, router, projectId]);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" type="button" onClick={() => setIsEditOpen(true)}>
          <Pencil className="size-4" /> Edit room
        </Button>

        <Button variant="ghost" type="button" className="text-red-400 hover:text-red-200" onClick={() => setIsConfirmOpen(true)}>
          <Trash2 className="size-4" /> Delete room
        </Button>
      </div>

      {isEditOpen && <RoomForm projectId={projectId} mode="edit" room={room} onClose={() => setIsEditOpen(false)} />}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-room-title" aria-describedby="delete-room-description">
          <form action={action} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111114] p-6 shadow-2xl">
            <h2 id="delete-room-title" className="text-xl font-medium">Delete Room</h2>
            <p id="delete-room-description" className="mt-3 text-sm leading-6 text-muted-foreground">
              This action cannot be undone.
            </p>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="roomId" value={room.id} />
            {state.error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="text-red-400 hover:text-red-200">
                {pending && <LoaderCircle className="size-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
