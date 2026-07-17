type BudgetableProduct = {
  selected_option_price?: number | null;
};

export function sumSelectedOptionPrices(products: BudgetableProduct[] | null | undefined): number {
  return (products ?? []).reduce((total, product) => total + (product.selected_option_price ?? 0), 0);
}
