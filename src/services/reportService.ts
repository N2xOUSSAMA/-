import { Sale, Product, Expense, Customer } from '../types';

export interface SalesSummaryMetrics {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  totalExpenses: number;
  totalSalesCount: number;
  totalItemsSold: number;
  averageBasketValue: number;
}

export interface TopSellingItem {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}

export const ReportService = {
  /**
   * Computes sales summary metrics for a given period and list of sales & expenses.
   */
  getSummaryMetrics(sales: Sale[], expenses: Expense[] = []): SalesSummaryMetrics {
    const totalRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const grossProfit = sales.reduce((sum, s) => sum + (s.profitTotal || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = Math.max(0, grossProfit - totalExpenses);
    const totalSalesCount = sales.length;

    const totalItemsSold = sales.reduce((sum, s) => {
      return sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0);
    }, 0);

    const totalCost = Math.max(0, totalRevenue - grossProfit);
    const averageBasketValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      netProfit,
      totalExpenses,
      totalSalesCount,
      totalItemsSold,
      averageBasketValue,
    };
  },

  /**
   * Extracts top selling products by quantity and revenue.
   */
  getTopSellingProducts(sales: Sale[], limit: number = 5): TopSellingItem[] {
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = itemMap.get(item.productId) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.total;
        existing.profit += (item.unitPrice - item.costPrice) * item.quantity;
        itemMap.set(item.productId, existing);
      }
    }

    return Array.from(itemMap.entries())
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        quantitySold: data.quantity,
        revenue: data.revenue,
        profit: data.profit,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  },

  /**
   * Computes customer debt aggregates.
   */
  getCustomerDebtSummary(customers: Customer[]): {
    totalDebt: number;
    indebtedCustomersCount: number;
  } {
    const indebted = customers.filter((c) => (c.balanceDebt || 0) > 0);
    const totalDebt = indebted.reduce((sum, c) => sum + (c.balanceDebt || 0), 0);
    return {
      totalDebt,
      indebtedCustomersCount: indebted.length,
    };
  },
};
