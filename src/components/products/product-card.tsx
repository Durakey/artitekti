import { ArrowRight, Package2 } from "lucide-react";

import { getPurchaseLabel, isPurchasedFromAmounts, resolveSelectedOption, sumPaidPayments } from "@/lib/rooms/purchase";
import { formatCurrency } from "@/lib/utils";
import type { RoomProduct, RoomProductOption, RoomProductPayment } from "@/lib/rooms/types";

type ProductCardProps = {
  product: RoomProduct;
  isSelected: boolean;
  onSelect: (productId: string) => void;
  options: RoomProductOption[];
  payments: RoomProductPayment[];
};

export function ProductCard({ product, isSelected, onSelect, options, payments }: ProductCardProps) {
  const selectedOption = resolveSelectedOption(options, product.selected_option_id);
  const paidAmount = sumPaidPayments(payments);
  const purchased = isPurchasedFromAmounts(selectedOption?.price, paidAmount);
  const purchaseLabel = getPurchaseLabel(purchased);

  return (
    <button
      type="button"
      onClick={() => onSelect(product.id)}
      className={`group flex w-full items-start gap-4 rounded-3xl border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d6c3a6]/40 ${isSelected ? "border-[#d6c3a6]/35 bg-[#f6eee1]" : "border bg-card"}`}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background">
        {product.cover_image_url ? (
          <img src={product.cover_image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package2 className="size-7 text-[#d6c3a6]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SELECTED OPTION</p>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold tracking-[-0.02em] text-foreground">{product.name}</h3>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-[#d6c3a6]" />
        </div>

        <div className="mt-4">
          <p className="text-2xl font-bold tracking-[-0.03em] text-foreground">{selectedOption ? formatCurrency(Number(selectedOption.price ?? 0), selectedOption.currency ?? "EUR") : "€0"}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Qty {product.quantity}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${purchased ? "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]" : "border-[#FDBA74] bg-[#FFEDD5] text-[#C2410C]"}`}>
            {purchaseLabel}
          </span>
        </div>

        {selectedOption ? (
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-muted-foreground">{selectedOption.store_name}</p>
            <p>{selectedOption.location ?? "Location pending"}</p>
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">No option selected yet.</div>
        )}
      </div>
    </button>
  );
}
