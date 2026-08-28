import { Product, Customer } from '../types';

export interface SystemNotification {
  id: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read?: boolean;
}

export const NotificationService = {
  /**
   * Scans products and returns low stock warnings.
   */
  getLowStockAlerts(products: Product[]): SystemNotification[] {
    const alerts: SystemNotification[] = [];

    for (const p of products) {
      if (p.stock <= (p.minStockAlert || 2)) {
        alerts.push({
          id: `low-stock-${p.id}`,
          type: p.stock === 0 ? 'danger' : 'warning',
          title: p.stock === 0 ? 'منتج نفد من المخزون!' : 'تنبيه: مخزون منخفض',
          message: `المنتج "${p.name}" المتبقي منه ${p.stock} ${p.unit} فقط.`,
          timestamp: Date.now(),
        });
      }
    }

    return alerts;
  },

  /**
   * Scans customers and returns high debt balance alerts.
   */
  getHighDebtAlerts(customers: Customer[], threshold: number = 10000): SystemNotification[] {
    const alerts: SystemNotification[] = [];

    for (const c of customers) {
      if ((c.balanceDebt || 0) >= threshold) {
        alerts.push({
          id: `debt-limit-${c.id}`,
          type: 'danger',
          title: 'تنبيه: مديونية مرتفعة للعميل',
          message: `العميل "${c.name}" بلغ رصيد ديونه ${c.balanceDebt} د.ج.`,
          timestamp: Date.now(),
        });
      }
    }

    return alerts;
  },
};
