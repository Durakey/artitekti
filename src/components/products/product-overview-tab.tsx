"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createProductPayment, deleteProductPayment, updateProductPayment, updateProductPaymentStatus, type ProductActionState } from "@/app/projects/[projectId]/rooms/[roomId]/actions";
import { Button } from "@/components/ui/button";
import { getPurchaseLabel, isPurchasedFromAmounts, sumPaidPayments } from "@/lib/rooms/purchase";
import { formatCurrency } from "@/lib/utils";
import type { RoomProduct, RoomProductOption, RoomProductPayment } from "@/lib/rooms/types";

type ProductOverviewTabProps = {
  product: RoomProduct;
  selectedOption: RoomProductOption | null;
  payments: RoomProductPayment[];
  projectId: string;
  roomId: string;
  onEdit: () => void;
  onDelete: () => void;
  onGoToOptions: () => void;
};

const initialState: ProductActionState = {};
const inputClass = "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15";

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export function ProductOverviewTab({ product, selectedOption, payments, projectId, roomId, onEdit, onDelete, onGoToOptions }: ProductOverviewTabProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RoomProductPayment | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentDueDate, setNewPaymentDueDate] = useState("");
  const [newPaymentNotes, setNewPaymentNotes] = useState("");
  const router = useRouter();
  const [paymentState, paymentAction, paymentPending] = useActionState(createProductPayment, initialState);
  const [paymentStatusState, paymentStatusAction, paymentStatusPending] = useActionState(updateProductPaymentStatus, initialState);
  const [paymentEditState, paymentEditAction, paymentEditPending] = useActionState(updateProductPayment, initialState);
  const [paymentDeleteState, paymentDeleteAction, paymentDeletePending] = useActionState(deleteProductPayment, initialState);

  const selectedOptionPrice = Number(selectedOption?.price ?? 0);
  const paidAmount = sumPaidPayments(payments);
  const remainingAmount = Math.max(0, selectedOptionPrice - paidAmount);
  const enteredAmount = newPaymentAmount === "" ? null : Number(newPaymentAmount);
  const amountExceedsRemaining = enteredAmount !== null && Number.isFinite(enteredAmount) && enteredAmount > remainingAmount;
  const noRemainingBalance = remainingAmount <= 0;
  const amountValidationError = amountExceedsRemaining
    ? `Amount exceeds remaining amount (${selectedOption?.currency ?? "EUR"} ${formatCurrency(remainingAmount, selectedOption?.currency ?? "EUR")}).`
    : null;
  const purchased = isPurchasedFromAmounts(selectedOptionPrice, paidAmount);
  const purchaseLabel = getPurchaseLabel(purchased);

  const paymentRows = payments.map((payment) => {
    const dueDate = new Date(`${payment.due_date}T00:00:00`);
    const today = startOfToday();
    const isPaid = Boolean(payment.paid_at);
    const isDueToday = dueDate.getTime() === today.getTime();
    const isDueSoon = dueDate.getTime() > today.getTime() && dueDate.getTime() <= today.getTime() + 7 * 24 * 60 * 60 * 1000;
    const status = isPaid
      ? "Paid"
      : dueDate < today
        ? "OVERDUE"
        : isDueToday
          ? "DUE TODAY"
          : isDueSoon
            ? "DUE SOON"
            : "UPCOMING";
    return {
      ...payment,
      status,
    };
  });

  useEffect(() => {
    if (paymentState.success || paymentStatusState.success || paymentEditState.success || paymentDeleteState.success) {
      router.refresh();
    }
  }, [paymentState.success, paymentStatusState.success, paymentEditState.success, paymentDeleteState.success, router]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Cover image</p>
        <div className="mt-4 flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-background text-sm text-muted-foreground">
          {product.cover_image_url ? <img src={product.cover_image_url} alt={product.name} className="h-full w-full object-cover" /> : "No cover image yet"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Product name</p>
          <p className="mt-3 text-base font-medium">{product.name}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Category</p>
          <p className="mt-3 text-base font-medium">{product.category ?? "—"}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Quantity</p>
          <p className="mt-3 text-base font-medium">{product.quantity}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Notes</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{product.notes ?? "No notes provided yet."}</p>
      </div>

      {/* Selected option summary */}
      {selectedOption ? (
        <div className="rounded-2xl border border-[#d6c3a6]/30 bg-card p-5">
          <p className="text-sm text-muted-foreground">Selected option</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-medium">{selectedOption.store_name}</p>
              <span className="rounded-full border border-[#d6c3a6]/30 px-2.5 py-1 text-xs font-medium text-[#d6c3a6]">Selected</span>
            </div>
            <p className="text-sm text-muted-foreground">Price: {formatCurrency(Number(selectedOption.price ?? 0), selectedOption.currency ?? "EUR")}</p>
            <p className="text-sm text-muted-foreground">Location: {selectedOption.location ?? "Not specified"}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">No option selected yet.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={onGoToOptions}>
            Go to Options
          </Button>
        </div>
      )}

      {selectedOption && (
        <>
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">Purchase status</p>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${purchased ? "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]" : "border-[#FDBA74] bg-[#FFEDD5] text-[#C2410C]"}`}>
                {purchaseLabel}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              A product is marked Purchased automatically when paid amount is greater than or equal to the selected option price.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">Payment history</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingPayment(null);
                  setNewPaymentAmount("");
                  setNewPaymentDueDate("");
                  setNewPaymentNotes("");
                  setIsPaymentModalOpen(true);
                }}
                disabled={noRemainingBalance}
              >
                + Add Payment
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-3">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(paidAmount, selectedOption?.currency ?? "EUR")}</p>
              </div>
              <div className="rounded-2xl border bg-card p-3">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(remainingAmount, selectedOption?.currency ?? "EUR")}</p>
              </div>
            </div>

            {paymentRows.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                No payments added yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {paymentRows.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border bg-card p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                      <p className="text-sm">Amount: {formatCurrency(Number(payment.amount), selectedOption?.currency ?? "EUR")}</p>
                      <p className="text-sm text-muted-foreground">Due Date: {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${payment.due_date}T00:00:00`))}</p>
                      {payment.notes ? <p className="text-sm text-muted-foreground">Notes: {payment.notes}</p> : null}
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${payment.status === "Paid" ? "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]" : payment.status === "OVERDUE" ? "border-[#fca5a5] bg-[#fee2e2] text-[#b91c1c]" : payment.status === "DUE TODAY" ? "border-[#fef3c7] bg-[#fef3c7] text-[#b45309]" : payment.status === "DUE SOON" ? "border-[#ffedd5] bg-[#ffedd5] text-[#c2410c]" : "border-[#dcfce7] bg-[#dcfce7] text-[#15803D]"}`}>
                          {payment.status}
                        </span>
                        <form action={paymentStatusAction}>
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="roomId" value={roomId} />
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input type="hidden" name="status" value={payment.status === "Paid" ? "pending" : "paid"} />
                          <Button type="submit" variant="ghost" disabled={paymentStatusPending} className="h-8 px-2 text-xs">
                            {payment.status === "Paid" ? "Mark Pending" : "Mark Paid"}
                          </Button>
                        </form>
                        {payment.status !== "Paid" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPayment(payment);
                                setNewPaymentAmount(String(payment.amount));
                                setNewPaymentDueDate(payment.due_date);
                                setIsPaymentModalOpen(true);
                              }}
                              className="rounded-full border bg-card px-2 py-1 text-xs font-medium text-muted-foreground hover:border-[#d6c3a6]/50"
                            >
                              Edit
                            </button>
                            <form action={paymentDeleteAction}>
                              <input type="hidden" name="projectId" value={projectId} />
                              <input type="hidden" name="roomId" value={roomId} />
                              <input type="hidden" name="productId" value={product.id} />
                              <input type="hidden" name="paymentId" value={payment.id} />
                              <Button type="submit" variant="ghost" disabled={paymentDeletePending} className="h-8 px-2 text-xs text-red-400">
                                Delete
                              </Button>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {paymentState.error && <p className="mt-3 text-sm text-red-400">{paymentState.error}</p>}
            {paymentStatusState.error && <p className="mt-3 text-sm text-red-400">{paymentStatusState.error}</p>}
          </div>
        </>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add Payment">
          <form action={editingPayment ? paymentEditAction : paymentAction} className="w-full max-w-md rounded-3xl border bg-card shadow-2xl">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="roomId" value={roomId} />
            <input type="hidden" name="productId" value={product.id} />
            <div className="flex items-center justify-between border-b border bg-background p-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payments</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{editingPayment ? "Edit Payment" : "Add Payment"}</h3>
              </div>
              <button type="button" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-white" onClick={() => {
                setNewPaymentAmount("");
                setNewPaymentDueDate("");
                setNewPaymentNotes("");
                setEditingPayment(null);
                setIsPaymentModalOpen(false);
              }} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <input type="hidden" name="paymentId" value={editingPayment?.id ?? ""} />
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span>Amount</span>
                <input
                  className={inputClass}
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newPaymentAmount}
                  onChange={(event) => setNewPaymentAmount(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Remaining balance: {formatCurrency(remainingAmount, selectedOption?.currency ?? "EUR")}
                </p>
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span>Due Date</span>
                <input
                  className={inputClass}
                  name="dueDate"
                  type="date"
                  required
                  value={newPaymentDueDate}
                  onChange={(event) => setNewPaymentDueDate(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground">
                <span>Notes (optional)</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#d6c3a6] focus:ring-2 focus:ring-[#d6c3a6]/15"
                  name="notes"
                  value={newPaymentNotes}
                  onChange={(event) => setNewPaymentNotes(event.target.value)}
                />
              </label>
              {amountValidationError && <p className="text-sm text-red-400">{amountValidationError}</p>}
              {paymentState.error && <p className="text-sm text-red-400">{paymentState.error}</p>}
              {paymentEditState.error && <p className="text-sm text-red-400">{paymentEditState.error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t p-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setNewPaymentAmount("");
                  setNewPaymentDueDate("");
                  setNewPaymentNotes("");
                  setEditingPayment(null);
                  setIsPaymentModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={(editingPayment ? paymentEditPending : paymentPending) || amountExceedsRemaining || noRemainingBalance}>
                {(editingPayment ? (paymentEditPending ? "Saving..." : "Update Payment") : (paymentPending ? "Saving..." : "Save Payment"))}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-red-400 hover:text-red-200"
          onClick={() => {
            setIsDeleting(true);
            onDelete();
          }}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}

