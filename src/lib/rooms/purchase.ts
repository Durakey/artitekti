type PurchaseOptionLike = {
  id: string;
  price: number | string | null;
  is_selected: boolean;
};

type PurchasePaymentLike = {
  amount: number | string;
  paid_at: string | null;
};

export function resolveSelectedOption<T extends PurchaseOptionLike>(options: T[], selectedOptionId?: string | null) {
  return options.find((option) => option.id === selectedOptionId) ?? options.find((option) => option.is_selected) ?? null;
}

export function sumPaidPayments<T extends PurchasePaymentLike>(payments: T[]) {
  return payments.reduce((sum, payment) => (payment.paid_at ? sum + Number(payment.amount ?? 0) : sum), 0);
}

export function isPurchasedFromAmounts(selectedOptionPrice: number | null | undefined, paidAmount: number) {
  const price = Number(selectedOptionPrice ?? 0);
  return price > 0 && paidAmount >= price;
}

export function getPurchaseLabel(isPurchased: boolean) {
  return isPurchased ? "Purchased" : "Pending Purchase";
}
