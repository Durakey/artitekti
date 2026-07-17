"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import { deleteProduct } from "@/app/projects/[projectId]/rooms/[roomId]/actions";
import { ProductAlternativesTab } from "@/components/products/product-alternatives-tab";
import { ProductForm } from "@/components/products/product-form";
import { ProductOverviewTab } from "@/components/products/product-overview-tab";
import { Button } from "@/components/ui/button";
import type { RoomProduct, RoomProductOption, RoomProductPayment } from "@/lib/rooms/types";

type ProductDrawerProps = {
  product: RoomProduct | null;
  options: RoomProductOption[];
  payments: RoomProductPayment[];
  projectId: string;
  roomId: string;
};

export function ProductDrawer({ product, options, payments, projectId, roomId }: ProductDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"product" | "options">("product");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const closeDrawer = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("product");
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [closeDrawer]);

  const productOptions = options.filter((o) => o.product_id === product?.id);
  const selectedOption = productOptions.find((o) => o.id === product?.selected_option_id) ?? productOptions.find((o) => o.is_selected) ?? null;
  const productPayments = payments.filter((payment) => payment.product_id === product?.id);

  const tabs = useMemo(
    () => [
      { id: "product", label: "Product" },
      { id: "options", label: "Options" },
    ],
    [],
  );

  const handleDelete = async () => {
    if (!product) return;
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("roomId", roomId);
    formData.set("productId", product.id);
    await deleteProduct({} as never, formData);
    closeDrawer();
    router.refresh();
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    setTouchStartY(event.touches[0].clientY);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartY === null) return;
    const distance = event.changedTouches[0].clientY - touchStartY;
    if (distance > 80) {
      closeDrawer();
    }
    setTouchStartY(null);
  };

  if (!product) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close product drawer"
        className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
        onClick={closeDrawer}
      />
      <aside
        className={`fixed z-50 flex flex-col bg-card shadow-2xl ${isMobile ? "inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl border-t" : "inset-y-0 right-0 w-full max-w-[560px] border-l"}`}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
              Back to Room
            </button>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{product.name}</h3>
          </div>
          <Button variant="ghost" type="button" onClick={closeDrawer} className="rounded-full px-3">
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-full px-3 py-2 text-sm transition ${activeTab === tab.id ? "bg-[#d6c3a6] text-black" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "product" && <ProductOverviewTab product={product} selectedOption={selectedOption} payments={productPayments} projectId={projectId} roomId={roomId} onEdit={() => setIsEditOpen(true)} onDelete={handleDelete} onGoToOptions={() => setActiveTab("options")} />}
          {activeTab === "options" && <ProductAlternativesTab product={product} projectId={projectId} roomId={roomId} options={productOptions} />}
        </div>
      </aside>

      {isEditOpen && <ProductForm projectId={projectId} roomId={roomId} mode="edit" product={product} onClose={() => setIsEditOpen(false)} />}
    </>
  );
}
