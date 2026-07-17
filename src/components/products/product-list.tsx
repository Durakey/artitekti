"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useMemo } from "react";

import { ProductCard } from "@/components/products/product-card";
import type { RoomProduct, RoomProductOption, RoomProductPayment } from "@/lib/rooms/types";

type ProductListProps = {
  products: RoomProduct[];
  options: RoomProductOption[];
  payments: RoomProductPayment[];
};

export function ProductList({ products, options, payments }: ProductListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProductId = searchParams.get("product") ?? "";

  const optionsByProduct = useMemo(() => {
    const grouped = new Map<string, RoomProductOption[]>();
    options.forEach((option) => {
      const list = grouped.get(option.product_id) ?? [];
      list.push(option);
      grouped.set(option.product_id, list);
    });
    return grouped;
  }, [options]);

  const paymentsByProduct = useMemo(() => {
    const grouped = new Map<string, RoomProductPayment[]>();
    payments.forEach((payment) => {
      const list = grouped.get(payment.product_id) ?? [];
      list.push(payment);
      grouped.set(payment.product_id, list);
    });
    return grouped;
  }, [payments]);

  const handleSelect = (productId: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("product", productId);
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="grid gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={selectedProductId === product.id}
          onSelect={handleSelect}
          options={optionsByProduct.get(product.id) ?? []}
          payments={paymentsByProduct.get(product.id) ?? []}
        />
      ))}
    </div>
  );
}

