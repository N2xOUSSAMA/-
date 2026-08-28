import React from 'react';
import { Sale, StoreSettings } from '../../types';
import { Printer, Share2, X, CheckCircle2, Download, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: StoreSettings;
  isNewSale?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
  isNewSale = false,
}) => {
  React.useEffect(() => {
    if (isOpen && isNewSale) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // confetti fallback
      }
    }
  }, [isOpen, isNewSale]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const lines = [
      `🧾 *فاتورة مبيعات - ${settings.storeName}*`,
      `رقم الفاتورة: #${sale.invoiceNumber}`,
      `التاريخ: ${new Date(sale.date).toLocaleString('ar-SA')}`,
      `الكاشير: ${sale.cashierName}`,
      `العميل: ${sale.customerName || 'عميل نقدي'}`,
      `------------------------`,
      ...sale.items.map(
        (i) => `▪ ${i.name} (x${i.quantity}) = ${(i.total).toFixed(2)} ${settings.currencySymbol}`
      ),
      `------------------------`,
      `*الإجمالي النهائي:* ${sale.grandTotal.toFixed(2)} ${settings.currencySymbol}`,
      `المدفوع: ${sale.paidAmount.toFixed(2)} ${settings.currencySymbol}`,
      sale.changeAmount > 0
        ? `المتبقي للعميل (الصرف): ${sale.changeAmount.toFixed(2)} ${settings.currencySymbol}`
        : '',
      `طريقة الدفع: ${
        sale.paymentMethod === 'cash'
          ? 'نقداً'
          : sale.paymentMethod === 'ccp'
          ? 'حساب CCP / بريدي موب'
          : sale.paymentMethod === 'card'
          ? 'بطاقة بنكية'
          : sale.paymentMethod === 'debt'
          ? 'آجل (دين)'
          : 'تحويل'
      }`,
      `\n${settings.receiptFooter || 'شكراً لتعاملكم معنا!'}`,
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">تم إتمام الفاتورة بنجاح</h3>
              <p className="text-[11px] text-slate-400 font-mono">#{sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Preview Area */}
        <div className="p-6 overflow-y-auto bg-slate-100/70 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white p-5 rounded-2xl shadow-md border border-slate-200 font-mono text-slate-900 text-xs leading-relaxed"
          >
            {/* Store Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-black tracking-tight font-sans text-slate-900">
                {settings.storeName}
              </h2>
              {settings.storePhone && (
                <p className="text-[11px] text-slate-600">هاتف: {settings.storePhone}</p>
              )}
              {settings.storeAddress && (
                <p className="text-[10px] text-slate-500">{settings.storeAddress}</p>
              )}
              {settings.taxRegistrationNumber && (
                <p className="text-[10px] text-slate-500">
                  الرقم الضريبي: {settings.taxRegistrationNumber}
                </p>
              )}
              {settings.receiptHeader && (
                <p className="text-[10px] text-emerald-800 bg-emerald-50 py-0.5 px-2 rounded mt-1 font-sans">
                  {settings.receiptHeader}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold text-slate-900 font-mono">#{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{new Date(sale.date).toLocaleString('ar-SA')}</span>
              </div>
              <div className="flex justify-between">
                <span>الكاشير:</span>
                <span className="text-slate-800">{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>العميل:</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-slate-700 text-[11px] pb-1.5 border-b border-slate-200">
                <span>الصنف / الكمية</span>
                <span>السعر الإجمالي</span>
              </div>

              <div className="divide-y divide-slate-100 py-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-start text-[11px]">
                    <div className="max-w-[70%]">
                      <div className="font-semibold text-slate-800 font-sans">{item.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.quantity} {item.unit} × {item.unitPrice.toFixed(2)} {settings.currencySymbol}
                        {item.discount > 0 && (
                          <span className="text-rose-600 mr-1">(خصم {item.discount}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 whitespace-nowrap">
                      {item.total.toFixed(2)} {settings.currencySymbol}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Totals */}
            <div className="py-2.5 space-y-1.5 border-b border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span>{sale.subtotal.toFixed(2)} {settings.currencySymbol}</span>
              </div>

              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>إجمالي الخصم:</span>
                  <span>- {sale.discountTotal.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}

              {settings.enableTax && sale.taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>ضريبة القيمة المضافة ({settings.taxRatePercent}%):</span>
                  <span>{sale.taxTotal.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-base text-slate-950 pt-1 border-t border-slate-300">
                <span>المبلغ الإجمالي:</span>
                <span>{sale.grandTotal.toFixed(2)} {settings.currencySymbol}</span>
              </div>

              <div className="flex justify-between text-slate-700 pt-1">
                <span>طريقة الدفع:</span>
                <span className="font-semibold">
                  {sale.paymentMethod === 'cash'
                    ? 'نقداً (Cash)'
                    : sale.paymentMethod === 'ccp'
                    ? 'بريدي موب / CCP'
                    : sale.paymentMethod === 'card'
                    ? 'بطاقة دفع (Card)'
                    : sale.paymentMethod === 'debt'
                    ? 'آجل (دين)'
                    : 'تحويل بنكي'}
                </span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span>المدفوع:</span>
                <span>{sale.paidAmount.toFixed(2)} {settings.currencySymbol}</span>
              </div>

              {sale.changeAmount > 0 && (
                <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <span>المتبقي للزبون (الصرف):</span>
                  <span>{sale.changeAmount.toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}

              {sale.paymentMethod === 'debt' && sale.grandTotal > sale.paidAmount && (
                <div className="flex justify-between font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                  <span>المسجل كدين آجل:</span>
                  <span>{(sale.grandTotal - sale.paidAmount).toFixed(2)} {settings.currencySymbol}</span>
                </div>
              )}
            </div>

            {/* Footer Message */}
            <div className="text-center pt-3 space-y-1.5 font-sans">
              <p className="text-[11px] font-semibold text-slate-700">
                {settings.receiptFooter || 'شكراً لزيارتكم!'}
              </p>
              <div className="w-24 h-1 bg-slate-900 mx-auto opacity-20 rounded"></div>
              <p className="text-[9px] text-slate-400 font-mono">نظام كاشير وإدارة المخزون الذكي</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-2.5 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 min-w-[120px] py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            طباعة الفاتورة
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            واتساب
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
