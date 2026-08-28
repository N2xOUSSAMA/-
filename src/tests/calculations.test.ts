import { describe, it, expect } from 'vitest';
import { CartItem } from '../types';
import { calculateCartTotals, calculateWeightedPrice, calculateChange } from '../utils/calculations';

describe('POS Cart & Financial Calculations', () => {
  const mockItems: CartItem[] = [
    {
      product: {
        id: '1',
        name: 'شيبس',
        barcode: '111',
        categoryId: 'cat_food',
        costPrice: 50,
        sellingPrice: 80,
        stock: 10,
        minStockAlert: 2,
        unit: 'piece',
      },
      quantity: 2,
      unitPrice: 80,
      discount: 0,
      discountType: 'percentage',
    },
    {
      product: {
        id: '2',
        name: 'مشروب غازي',
        barcode: '222',
        categoryId: 'cat_drink',
        costPrice: 60,
        sellingPrice: 100,
        stock: 20,
        minStockAlert: 5,
        unit: 'piece',
      },
      quantity: 1,
      unitPrice: 100,
      discount: 0,
      discountType: 'percentage',
    },
  ];

  it('calculates gross subtotal correctly', () => {
    const res = calculateCartTotals(mockItems, 0, 'fixed', 0);
    // (80*2) + (100*1) = 160 + 100 = 260
    expect(res.subtotal).toBe(260);
    expect(res.total).toBe(260);
    // Total cost = (50*2) + (60*1) = 160. Profit = 260 - 160 = 100
    expect(res.netProfit).toBe(100);
  });

  it('applies percentage discount properly', () => {
    const res = calculateCartTotals(mockItems, 10, 'percentage', 0);
    // 10% of 260 = 26. Total = 234
    expect(res.discountAmount).toBe(26);
    expect(res.total).toBe(234);
  });

  it('applies fixed amount discount properly without exceeding total', () => {
    const res = calculateCartTotals(mockItems, 50, 'fixed', 0);
    expect(res.discountAmount).toBe(50);
    expect(res.total).toBe(210);

    const resOverDiscount = calculateCartTotals(mockItems, 500, 'fixed', 0);
    expect(resOverDiscount.discountAmount).toBe(260);
    expect(resOverDiscount.total).toBe(0);
  });

  it('computes change return accurately', () => {
    const res = calculateChange(260, 500);
    expect(res.changeAmount).toBe(240);
    expect(res.isFullyPaid).toBe(true);
    expect(res.remainingDue).toBe(0);

    const underpaid = calculateChange(260, 200);
    expect(underpaid.changeAmount).toBe(0);
    expect(underpaid.isFullyPaid).toBe(false);
    expect(underpaid.remainingDue).toBe(60);
  });

  it('calculates weighted price accurately for bulk goods', () => {
    // 500 DZD per KG, 250 grams = 125 DZD
    expect(calculateWeightedPrice(500, 250)).toBe(125);
    // 1200 DZD per KG, 750 grams = 900 DZD
    expect(calculateWeightedPrice(1200, 750)).toBe(900);
  });
});

