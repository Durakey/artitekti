"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ProductDrawer } from "@/components/products/product-drawer";
import { ProductForm } from "@/components/products/product-form";
import { ProductList } from "@/components/products/product-list";
import type { RoomProduct, RoomProductOption, RoomProductPayment } from "@/lib/rooms/types";

export function RoomProductSection({ projectId, roomId, roomName, products, options, payments }: { projectId: string; roomId: string; roomName: string; products: RoomProduct[]; options: RoomProductOption[]; payments: RoomProductPayment[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const searchParams = useSearchParams();

  const selectedProduct = useMemo(() => {
    const selectedProductId = searchParams.get("product");
    return products.find((product) => product.id === selectedProductId) ?? null;
  }, [products, searchParams]);

  return (
    <>
      <section className="mt-10 rounded-2xl border bg-card p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Products</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{roomName}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Manage products for this room.</p>
          </div>
          <Button variant="outline" type="button" onClick={() => setIsFormOpen(true)}>
            + Add Product
          </Button>
        </div>

        {products.length === 0 ? (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="block w-full rounded-2xl border border-dashed bg-background p-10 text-left transition hover:border-[#d6c3a6]/50"
          >
            <div>
              <p className="text-sm text-muted-foreground">No products yet</p>
              <h3 className="mt-2 text-xl font-semibold">Start adding products for this room.</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Build your product list before adding options and purchase details.</p>
              <div className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#d6c3a6] px-4 text-sm font-medium text-black transition hover:bg-[#e3d2b9]">
                + Add Product
              </div>
            </div>
          </button>
        ) : (
          <ProductList products={products} options={options} payments={payments} />
        )}

        {isFormOpen && <ProductForm projectId={projectId} roomId={roomId} onClose={() => setIsFormOpen(false)} />}
      </section>

      <ProductDrawer product={selectedProduct} options={options} payments={payments} projectId={projectId} roomId={roomId} />
    </>
  );
}
