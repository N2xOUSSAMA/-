import { CartItem, Product, SaleItem } from '../types';

export interface CartCalculationResult {
  subtotal: number;
  costSubtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  netProfit: number;
  itemCount: number;
}

/**
 * Calculates complete totals for a POS cart including discounts, taxes, and net profit margins.
 */
export function calculateCartTotals(
  items: CartItem[],
  discount: number = 0,
  discountType: 'percentage' | 'fixed' = 'percentage',
  taxRate: number = 0
): CartCalculationResult {
  const subtotal = items.reduce((sum, item) => {
    const price = item.unitPrice ?? item.product.sellingPrice;
    return sum + price * item.quantity;
  }, 0);

  const costSubtotal = items.reduce((sum, item) => {
    return sum + item.product.costPrice * item.quantity;
  }, 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * Math.min(100, Math.max(0, discount))) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, discount));
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * Math.max(0, taxRate)) / 100;
  const total = taxableAmount + taxAmount;
  const netProfit = Math.max(0, total - costSubtotal);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    costSubtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
    netProfit,
    itemCount,
  };
}

/**
 * Calculates profit and profit margin percentage for a single product or sale item.
 */
export function calculateItemProfit(costPrice: number, sellingPrice: number, quantity: number = 1): {
  profit: number;
  profitMarginPercent: number;
} {
  const profit = Math.max(0, (sellingPrice - costPrice) * quantity);
  const profitMarginPercent = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;
  return { profit, profitMarginPercent };
}

/**
 * Calculates the exact price for weighted items based on price per kilogram and weight in grams.
 */
export function calculateWeightedPrice(pricePerKg: number, weightInGrams: number): number {
  if (pricePerKg <= 0 || weightInGrams <= 0) return 0;
  const price = (pricePerKg * weightInGrams) / 1000;
  return Math.round(price * 100) / 100;
}

/**
 * Calculates change due to customer.
 */
export function calculateChange(total: number, paidAmount: number): {
  changeAmount: number;
  isFullyPaid: boolean;
  remainingDue: number;
} {
  const diff = paidAmount - total;
  if (diff >= 0) {
    return {
      changeAmount: diff,
      isFullyPaid: true,
      remainingDue: 0,
    };
  } else {
    return {
      changeAmount: 0,
      isFullyPaid: false,
      remainingDue: Math.abs(diff),
    };
  }
}
