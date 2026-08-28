import { exportToCSV, exportToJSON } from '../utils/exportHelpers';
import { Product, Sale, Customer, Expense } from '../types';
import { formatDate } from '../utils/formatters';

export const ExportService = {
  /**
   * Exports inventory products to CSV.
   */
  exportProductsToCSV(products: Product[]): void {
    const headers = ['المعرف', 'الباركود', 'اسم المنتج', 'سعر التكلفة', 'سعر البيع', 'المخزون', 'الوحدة'];
    const rows = products.map((p) => [
      p.id,
      p.barcode,
      p.name,
      p.costPrice,
      p.sellingPrice,
      p.stock,
      p.unit,
    ]);
    exportToCSV(`inventory_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  },

  /**
   * Exports sales transactions to CSV.
   */
  exportSalesToCSV(sales: Sale[]): void {
    const headers = ['رقم الفاتورة', 'التاريخ', 'عدد السلع', 'الإجمالي', 'الربح', 'طريقة الدفع', 'الكاشير', 'العميل'];
    const rows = sales.map((s) => [
      s.invoiceNumber,
      formatDate(s.date),
      s.items.reduce((sum, item) => sum + item.quantity, 0),
      s.grandTotal,
      s.profitTotal,
      s.paymentMethod,
      s.cashierName,
      s.customerName || 'زبون عام',
    ]);
    exportToCSV(`sales_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  },

  /**
   * Exports customers and debt balances to CSV.
   */
  exportCustomersToCSV(customers: Customer[]): void {
    const headers = ['اسم العميل', 'رقم الهاتف', 'الديون المتبقية', 'إجمالي المشتريات', 'ملاحظات'];
    const rows = customers.map((c) => [
      c.name,
      c.phone || '',
      c.balanceDebt || 0,
      c.totalSpent || 0,
      c.notes || '',
    ]);
    exportToCSV(`customers_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  },

  /**
   * Exports entire system state as JSON backup bundle.
   */
  exportBackupBundle(data: {
    products: Product[];
    sales: Sale[];
    customers: Customer[];
    expenses: Expense[];
  }): void {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      ...data,
    };
    exportToJSON(`kiosk_backup_${new Date().toISOString().slice(0, 10)}`, payload);
  },
};
