import { Button } from "@/components/ui/button";

export function RoomEmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="block w-full rounded-3xl border border-dashed border-white/10 bg-[#0b0b0f] p-8 text-left transition hover:border-white/20 hover:bg-[#111114]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d6c3a6]">Rooms</p>
        <h3 className="mt-3 text-xl font-medium">Add your first room</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Click to start room planning for this project.</p>
        <div className="mt-6">
          <Button variant="outline" type="button">+ Add Room</Button>
        </div>
      </div>
    </button>
  );
}
