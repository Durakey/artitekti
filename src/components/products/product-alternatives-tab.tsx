"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createAlternative, deleteAlternative, deselectAlternative, selectAlternative, updateAlternative, type ProductActionState } from "@/app/projects/[projectId]/rooms/[roomId]/actions";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { RoomProduct, RoomProductOption } from "@/lib/rooms/types";

type ProductAlternativesTabProps = {
  product: RoomProduct;
  projectId: string;
  roomId: string;
  options: RoomProductOption[];
};

const initialState: ProductActionState = {};

export function ProductAlternativesTab({ product, projectId, roomId, options }: ProductAlternativesTabProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, action, pending] = useActionState(createAlternative, initialState);
  const [editState, editAction, editPending] = useActionState(updateAlternative, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAlternative, initialState);
  const [selectState, selectAction, selectPending] = useActionState(selectAlternative, initialState);
  const [deselectState, deselectAction, deselectPending] = useActionState(deselectAlternative, initialState);

  useEffect(() => {
    if (state.success || editState.success || deleteState.success || selectState.success || deselectState.success) {
      router.refresh();
    }
  }, [state.success, editState.success, deleteState.success, selectState.success, deselectState.success, router]);

  const selectedOption = options.find((option) => option.id === product.selected_option_id) ?? options.find((option) => option.is_selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{selectedOption ? "Selected option" : "Options"}</p>
        <Button type="button" variant="outline" onClick={() => setIsAdding((v) => !v)}>
          {isAdding ? "Cancel" : "+ Add Option"}
        </Button>
      </div>

      {isAdding && (
        <form action={action} className="space-y-3 rounded-2xl border bg-card p-4">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="roomId" value={roomId} />
          <input type="hidden" name="projectId" value={projectId} />
          <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="cover_image_url" placeholder="Cover photo URL" />
          <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="store_name" placeholder="Store name" required />
          <div className="flex gap-2">
            <input className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm" name="price" placeholder="Price" type="number" min="0" step="0.01" required />
            <input className="h-10 w-20 rounded-xl border bg-background px-3 text-sm" name="currency" placeholder="EUR" maxLength={3} />
          </div>
          <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="location" placeholder="Location" />
          <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="phone_number" type="tel" placeholder="Phone Number" />
          <textarea className="min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm" name="notes" placeholder="Notes" />
          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save option"}</Button>
        </form>
      )}

      {options.length === 0 && !isAdding && (
        <div className="rounded-2xl border border-dashed bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No options yet.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setIsAdding(true)}>
            + Add Option
          </Button>
        </div>
      )}

      {options.map((option) => {
        const isSelected = option.is_selected || option.id === product.selected_option_id;
        const isEditing = editingId === option.id;

        return (
          <div
            key={option.id}
            className={`rounded-2xl border bg-card p-4 transition ${isSelected ? "border-[#d6c3a6]/25" : "border"}`}
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
                  {option.cover_image_url
                    ? <img src={option.cover_image_url} alt={option.store_name} className="h-full w-full object-cover" />
                    : <span className="text-xs text-muted-foreground">Photo</span>}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{option.store_name}</p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">{formatCurrency(Number(option.price ?? 0), option.currency ?? "EUR")}</p>
                  {option.location && <p className="mt-1 text-sm text-muted-foreground">{option.location}</p>}
                </div>
              </div>
              {isSelected && (
                <span className="shrink-0 rounded-full border border-[#d6c3a6]/30 bg-[#f0e4cf] px-2.5 py-1 text-xs font-medium text-foreground">
                  Selected
                </span>
              )}
            </div>

            {/* Option details */}
            {(option.notes || option.phone_number) && (
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {option.notes && <p>{option.notes}</p>}
                {option.phone_number && <p className="truncate">{option.phone_number}</p>}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!isSelected && (
                <form action={selectAction}>
                  <input type="hidden" name="alternativeId" value={option.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="roomId" value={roomId} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <Button type="submit" variant="outline" disabled={selectPending}>
                    {selectPending ? "Selecting..." : "Select"}
                  </Button>
                </form>
              )}
              <Button type="button" variant="ghost" onClick={() => setEditingId(isEditing ? null : option.id)}>
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              {isSelected && (
                <form action={deselectAction}>
                  <input type="hidden" name="alternativeId" value={option.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="roomId" value={roomId} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <Button type="submit" variant="outline" className="text-yellow-300 hover:text-yellow-100" disabled={deselectPending}>
                    {deselectPending ? "Deselecting..." : "Deselect"}
                  </Button>
                </form>
              )}
              <form action={deleteAction}>
                <input type="hidden" name="alternativeId" value={option.id} />
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="projectId" value={projectId} />
                <Button type="submit" variant="ghost" className="text-red-400 hover:text-red-200" disabled={deletePending}>
                  {deletePending ? "Deleting..." : "Delete"}
                </Button>
              </form>
            </div>

            {/* Edit form */}
            {isEditing && (
              <form action={editAction} className="mt-4 space-y-3 rounded-2xl border bg-card p-4">
                <input type="hidden" name="alternativeId" value={option.id} />
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="projectId" value={projectId} />
                <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="cover_image_url" defaultValue={option.cover_image_url ?? ""} placeholder="Cover photo URL" />
                <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="store_name" defaultValue={option.store_name} required />
                <div className="flex gap-2">
                  <input className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm" name="price" defaultValue={option.price} type="number" min="0" step="0.01" />
                  <input className="h-10 w-20 rounded-xl border bg-background px-3 text-sm" name="currency" defaultValue={option.currency ?? "EUR"} maxLength={3} />
                </div>
                <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="location" defaultValue={option.location ?? ""} placeholder="Location" />
                <input className="h-10 w-full rounded-xl border bg-background px-3 text-sm" name="phone_number" type="tel" defaultValue={option.phone_number ?? ""} placeholder="Phone Number" />
                <textarea className="min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm" name="notes" defaultValue={option.notes ?? ""} />
                {editState.error && <p className="text-sm text-red-400">{editState.error}</p>}
                <Button type="submit" disabled={editPending}>{editPending ? "Saving..." : "Save changes"}</Button>
              </form>
            )}

          </div>
        );
      })}
    </div>
  );
}
