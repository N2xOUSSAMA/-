import { Sale, StoreSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const PrintService = {
  /**
   * Triggers native print for the active window or printable target.
   */
  printReceipt(sale: Sale, settings: StoreSettings): void {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      // Fallback to window.print() if popup blocked
      window.print();
      return;
    }

    const itemsHtml = sale.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 4px 0; text-align: right;">${item.name}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: left; font-family: monospace;">${item.total.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>فاتورة #${sale.invoiceNumber}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 10px;
              color: #000;
              width: 80mm;
            }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .header h2 { margin: 0 0 4px 0; font-size: 16px; }
            .header p { margin: 2px 0; font-size: 11px; }
            .meta { font-size: 10px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px; }
            .totals { border-top: 1px dashed #000; padding-top: 6px; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-size: 14px; font-weight: bold; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
            .footer { text-align: center; font-size: 10px; margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px; }
            @media print {
              body { width: 100%; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${settings.storeName || 'كشك متعدد الخدمات'}</h2>
            ${settings.storePhone ? `<p>هاتف: ${settings.storePhone}</p>` : ''}
            ${settings.storeAddress ? `<p>${settings.storeAddress}</p>` : ''}
          </div>

          <div class="meta">
            <div>رقم الفاتورة: #${sale.invoiceNumber}</div>
            <div>التاريخ: ${formatDateTime(sale.date)}</div>
            <div>الكاشير: ${sale.cashierName || 'المشرف'}</div>
            ${sale.customerName ? `<div>العميل: ${sale.customerName}</div>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: right;">السلعة</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: left;">المجموع</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>المجموع الفرعي:</span>
              <span>${sale.subtotal.toFixed(2)} ${settings.currencySymbol}</span>
            </div>
            ${
              sale.discountTotal > 0
                ? `<div class="row">
                    <span>الخصم:</span>
                    <span>-${sale.discountTotal.toFixed(2)} ${settings.currencySymbol}</span>
                  </div>`
                : ''
            }
            <div class="row grand-total">
              <span>الإجمالي المستحق:</span>
              <span>${sale.grandTotal.toFixed(2)} ${settings.currencySymbol}</span>
            </div>
            <div class="row" style="font-size: 11px; margin-top: 4px;">
              <span>المدفوع نقداً:</span>
              <span>${sale.paidAmount.toFixed(2)} ${settings.currencySymbol}</span>
            </div>
            ${
              sale.changeAmount > 0
                ? `<div class="row" style="font-size: 11px;">
                    <span>المتبقي للعميل (الصرف):</span>
                    <span>${sale.changeAmount.toFixed(2)} ${settings.currencySymbol}</span>
                  </div>`
                : ''
            }
          </div>

          <div class="footer">
            <p>${settings.receiptFooter || 'شكراً لزيارتكم، دمتم في رعاية الله'}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  },
};
