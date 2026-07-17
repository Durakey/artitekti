"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createProduct, updateProduct, type ProductActionState } from "@/app/projects/[projectId]/rooms/[roomId]/actions";
import type { RoomProduct } from "@/lib/rooms/types";

const initialState: ProductActionState = {};
const inputClass = "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15";

type ProductFormProps = {
  projectId: string;
  roomId: string;
  onClose: () => void;
  mode?: "create" | "edit";
  product?: RoomProduct;
};

export function ProductForm({ projectId, roomId, onClose, mode = "create", product }: ProductFormProps) {
  const router = useRouter();
  const serverAction = mode === "edit" ? updateProduct : createProduct;
  const [state, action, pending] = useActionState(serverAction as (state: ProductActionState, payload: FormData) => Promise<ProductActionState>, initialState);
  const title = mode === "edit" ? "Edit product" : "Add product";
  const submitLabel = mode === "edit" ? "Save product" : "Add product";

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    onClose();
  }, [state.success, router, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <form action={action} className="w-full max-w-2xl rounded-3xl border bg-card p-6 shadow-2xl">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="roomId" value={roomId} />
        {mode === "edit" && <input type="hidden" name="productId" value={product?.id ?? ""} />}

        <div className="flex items-start justify-between gap-4 border-b bg-background pb-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Products</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted">
            Close
          </button>
        </div>

        <div className="space-y-5 py-6">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Name</span>
            <input className={inputClass} name="name" required maxLength={160} defaultValue={product?.name ?? ""} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Category</span>
            <input className={inputClass} name="category" maxLength={160} defaultValue={product?.category ?? ""} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Notes</span>
            <textarea className="min-h-24 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15" name="notes" maxLength={2000} defaultValue={product?.notes ?? ""} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-foreground">
              <span>Quantity</span>
              <input className={inputClass} name="quantity" required type="number" min="0" defaultValue={product?.quantity?.toString() ?? "1"} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-foreground">
              <span>Cover image URL</span>
              <input className={inputClass} name="cover_image_url" maxLength={2048} defaultValue={product?.cover_image_url ?? ""} />
            </label>
          </div>

          {state.error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{state.error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border p-4 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} type="submit">
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
