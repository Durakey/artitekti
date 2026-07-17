"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";

import { createRoom, updateRoom, type RoomActionState } from "@/app/projects/[projectId]/rooms/actions";
import { Button } from "@/components/ui/button";

const initialState: RoomActionState = {};
const inputClass = "h-10 w-full rounded-xl border border-[#E8E8E8] bg-white px-3 text-sm text-foreground placeholder:text-slate-500 outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15";

type RoomFormValues = {
  id: string;
  name: string;
  description?: string | null;
};

type RoomFormProps = {
  projectId: string;
  onClose: () => void;
  mode?: "create" | "edit";
  room?: RoomFormValues;
};

export function RoomForm({ projectId, onClose, mode = "create", room }: RoomFormProps) {
  const router = useRouter();
  const serverAction = mode === "edit" ? updateRoom : createRoom;
  const [state, action, pending] = useActionState(serverAction as (state: RoomActionState, payload: FormData) => Promise<RoomActionState>, initialState);
  const title = mode === "edit" ? "Edit room" : "Add a room";
  const submitLabel = mode === "edit" ? "Save room" : "Add room";

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onClose();
  }, [state.success, router, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25 p-0 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <form action={action} className="flex h-full w-full max-w-xl flex-col border-l border-[#E8E8E8] bg-white shadow-2xl">
        <input type="hidden" name="projectId" value={projectId} />
        {mode === "edit" && <input type="hidden" name="roomId" value={room?.id ?? ""} />}
        <div className="flex items-start justify-between border-b border-[#E8E8E8] p-6">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Rooms</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
          </div>
          <button className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onClose()} type="button" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Room name</span>
            <input className={inputClass} name="name" required maxLength={160} defaultValue={room?.name} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Description</span>
            <textarea className="min-h-28 rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-slate-500 outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name="description" maxLength={1000} defaultValue={room?.description ?? ""} />
          </label>
          {state.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t p-5">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} type="submit">
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
