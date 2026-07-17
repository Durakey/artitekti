import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeStatus(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

export function formatCurrency(amount: number, currency = "EUR") {
  const value = Number(amount ?? 0);
  const precision = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}
