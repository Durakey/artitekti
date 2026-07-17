import type { RoomWithBudget } from "@/lib/rooms/types";
import { RoomCard } from "@/components/rooms/room-card";

export function RoomList({ projectId, rooms, currency }: { projectId: string; rooms: RoomWithBudget[]; currency: string }) {
  return (
    <div className="grid gap-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} projectId={projectId} room={room} currency={currency} />
      ))}
    </div>
  );
}
