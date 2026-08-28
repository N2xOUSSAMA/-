import React, { useState, useEffect, useRef } from 'react';
import { Product, StoreSettings } from '../../types';
import {
  Printer,
  Barcode as BarcodeIcon,
  X,
  Plus,
  Minus,
  Copy,
  Check,
  Search,
  Settings2,
  Maximize2,
  Layers,
  Sparkles,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: StoreSettings;
  preselectedProduct?: Product | null;
}

export type PaperType = 'thermal_single' | 'sheet_a4' | 'custom_label';

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  products,
  settings,
  preselectedProduct,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    preselectedProduct || (products.length > 0 ? products[0] : null)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copyCount, setCopyCount] = useState<number>(1);
  
  // Paper & Printer mode
  const [printerMode, setPrinterMode] = useState<'thermal' | 'a4_grid' | 'custom'>('thermal');
  
  // Dimensions in millimeters for accurate 1:1 hardware fit
  const [labelWidthMm, setLabelWidthMm] = useState<number>(50);
  const [labelHeightMm, setLabelHeightMm] = useState<number>(30);
  const [fontSizeScale, setFontSizeScale] = useState<'compact' | 'normal' | 'large'>('normal');

  // Preset sizes
  const [presetSize, setPresetSize] = useState<string>('50x30');

  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (preselectedProduct) {
      setSelectedProduct(preselectedProduct);
    } else if (!selectedProduct && products.length > 0) {
      setSelectedProduct(products[0]);
    }
  }, [preselectedProduct, products]);

  // Handle Preset changes
  const applyPreset = (preset: string) => {
    setPresetSize(preset);
    switch (preset) {
      case '50x30': // standard thermal roll
        setPrinterMode('thermal');
        setLabelWidthMm(50);
        setLabelHeightMm(30);
        break;
      case '40x25': // small jewelry / accessories roll
        setPrinterMode('thermal');
        setLabelWidthMm(40);
        setLabelHeightMm(25);
        break;
      case '60x40': // large food / boxes thermal
        setPrinterMode('thermal');
        setLabelWidthMm(60);
        setLabelHeightMm(40);
        break;
      case '75x35': // shelf edge label
        setPrinterMode('thermal');
        setLabelWidthMm(75);
        setLabelHeightMm(35);
        break;
      case 'a4_24': // A4 sheet 24 labels (3x8)
        setPrinterMode('a4_grid');
        setLabelWidthMm(70);
        setLabelHeightMm(37);
        setCopyCount(24);
        break;
      case 'a4_40': // A4 sheet 40 labels (4x10)
        setPrinterMode('a4_grid');
        setLabelWidthMm(52.5);
        setLabelHeightMm(29.7);
        setCopyCount(40);
        break;
      case 'custom':
        setPrinterMode('custom');
        break;
      default:
        break;
    }
  };

  // Render barcode dynamic SVG
  useEffect(() => {
    if (selectedProduct && selectedProduct.barcode && barcodeSvgRef.current) {
      try {
        const barWidth = labelWidthMm <= 40 ? 1.2 : labelWidthMm >= 60 ? 1.9 : 1.5;
        const barHeight = Math.max(22, Math.min(48, Math.round(labelHeightMm * 1.1)));

        JsBarcode(barcodeSvgRef.current, selectedProduct.barcode, {
          format: 'CODE128',
          lineColor: '#000000',
          width: barWidth,
          height: barHeight,
          displayValue: showBarcodeText,
          font: 'monospace',
          fontSize: labelWidthMm <= 40 ? 10 : 12,
          textMargin: 2,
          margin: 1,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [selectedProduct, labelWidthMm, labelHeightMm, showBarcodeText]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!selectedProduct) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const svgHtml = barcodeSvgRef.current?.outerHTML || '';

    // Calculate font sizes according to exact mm dimensions
    const titleFontSize = labelWidthMm <= 40 ? '9px' : labelWidthMm >= 65 ? '13px' : '11px';
    const storeFontSize = labelWidthMm <= 40 ? '8px' : '9.5px';
    const priceFontSize = labelWidthMm <= 40 ? '13px' : labelWidthMm >= 65 ? '18px' : '15px';

    let stickersHtml = '';

    if (printerMode === 'thermal') {
      // Individual exact sticker pages (1 sticker per page in roll)
      for (let i = 0; i < copyCount; i++) {
        stickersHtml += `
          <div class="thermal-label-page">
            <div class="sticker-inner">
              ${showStoreName ? `<div class="store-name">${settings.storeName || 'المتجر'}</div>` : ''}
              ${showProductName ? `<div class="product-name">${selectedProduct.name}</div>` : ''}
              ${showPrice ? `<div class="price-tag">${selectedProduct.sellingPrice.toFixed(2)} ${settings.currencySymbol || 'دج'}</div>` : ''}
              <div class="barcode-svg-container">${svgHtml}</div>
            </div>
          </div>
        `;
      }
    } else {
      // Sheet / Grid layout (e.g. A4 sheet or multiple stickers)
      for (let i = 0; i < copyCount; i++) {
        stickersHtml += `
          <div class="sheet-sticker-card">
            <div class="sticker-inner">
              ${showStoreName ? `<div class="store-name">${settings.storeName || 'المتجر'}</div>` : ''}
              ${showProductName ? `<div class="product-name">${selectedProduct.name}</div>` : ''}
              ${showPrice ? `<div class="price-tag">${selectedProduct.sellingPrice.toFixed(2)} ${settings.currencySymbol || 'دج'}</div>` : ''}
              <div class="barcode-svg-container">${svgHtml}</div>
            </div>
          </div>
        `;
      }
    }

    const pageCss =
      printerMode === 'thermal'
        ? `@page { size: ${labelWidthMm}mm ${labelHeightMm}mm; margin: 0; }`
        : `@page { size: A4; margin: 5mm; }`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>ملصق باركود - ${selectedProduct.name}</title>
        <style>
          ${pageCss}
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            background: #fff;
            color: #000;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          /* Thermal 1:1 roll label styling */
          .thermal-label-page {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            page-break-after: always;
            page-break-inside: avoid;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 1.5mm;
          }

          /* A4 Sheet stickers grid */
          .stickers-sheet-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
            justify-content: flex-start;
            padding: 0;
          }
          .sheet-sticker-card {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            border: 1px dashed #bbb;
            page-break-inside: avoid;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 1.5mm;
          }

          .sticker-inner {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
          }

          .store-name {
            font-size: ${storeFontSize};
            font-weight: 700;
            color: #444;
            line-height: 1.1;
            max-width: 98%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .product-name {
            font-size: ${titleFontSize};
            font-weight: 800;
            color: #000;
            line-height: 1.15;
            max-width: 98%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 1px;
          }

          .price-tag {
            font-size: ${priceFontSize};
            font-weight: 900;
            font-family: monospace, system-ui;
            color: #000;
            line-height: 1.1;
            margin: 1px 0;
          }

          .barcode-svg-container {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .barcode-svg-container svg {
            width: 96%;
            max-width: 96%;
            height: auto;
            display: block;
          }

          @media print {
            .no-print { display: none; }
            .sheet-sticker-card {
              border: 0.5px dashed #ccc;
            }
          }
        </style>
      </head>
      <body>
        ${
          printerMode === 'thermal'
            ? stickersHtml
            : `<div class="stickers-sheet-grid">${stickersHtml}</div>`
        }
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleCopyBarcode = () => {
    if (selectedProduct?.barcode) {
      navigator.clipboard.writeText(selectedProduct.barcode);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <BarcodeIcon className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>طباعة الباركود بدقة 100% على مقاس الورقة والرول</span>
                <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  مطابق للطابعات الحرارية & A4
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                ضبط أوتوماتيكي لمقاس الملصق بالمليمتر (mm) ليتطابق مع حجم الورقة بدقة دون أي قص أو حواف زائدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[78vh]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Product Selection List */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  1. اختر السلعة المراد طباعتها:
                </label>
                <span className="text-[10px] text-slate-400">
                  {filteredProducts.length} صنف متوفر
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الباركود..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Products List */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    لا توجد سلع تطابق البحث
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const isSelected = selectedProduct?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        className={`w-full text-right p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400/40'
                            : 'bg-white hover:bg-indigo-50/60 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p
                            className={`text-[10px] font-mono mt-0.5 ${
                              isSelected ? 'text-indigo-200' : 'text-slate-500'
                            }`}
                          >
                            {p.barcode}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold font-mono shrink-0 pl-1 ${
                            isSelected ? 'text-white' : 'text-emerald-700'
                          }`}
                        >
                          {p.sellingPrice} {settings.currencySymbol}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Quick Barcode Generation Info Box */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">ميزة الباركود التلقائي:</span>
                  السلع التي ليس لها باركود مصنع يتم توليد باركود قياسي جزائري لها تلقائياً ويمكنك طباعته فوراً ليتعرف عليه قارئ الباركود بسلاسة.
                </div>
              </div>
            </div>

            {/* Right Column: Size Presets, Exact Dimensions, and Live 1:1 Preview */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Paper / Printer Presets */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  2. مقاس الورقة / الرول (اختر مقاس طابعتك أو حدد مقاساً مخصصاً):
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: '50x30', label: 'رول حراري قياسي', size: '50 × 30 مم', icon: '🖨️' },
                    { id: '40x25', label: 'رول صغير (إكسسوارات)', size: '40 × 25 مم', icon: '🏷️' },
                    { id: '60x40', label: 'رول عريض / علب', size: '60 × 40 مم', icon: '📦' },
                    { id: '75x35', label: 'ملصق الرف (Shelf)', size: '75 × 35 مم', icon: '🏪' },
                    { id: 'a4_24', label: 'ورق A4 (24 ملصق)', size: '70 × 37 مم', icon: '📄' },
                    { id: 'custom', label: 'مقاس يدوي مخصص', size: 'بالمليمتر (mm)', icon: '📐' },
                  ].map((p) => {
                    const isSelected = presetSize === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`p-2 rounded-xl text-right border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-400/40'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{p.icon}</span>
                          <span className="text-xs font-bold truncate">{p.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono mt-1 ${
                            isSelected ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          {p.size}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exact Custom Dimensions (If custom or fine-tuning needed) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-center">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    العرض (Width):
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="25"
                      max="150"
                      value={labelWidthMm}
                      onChange={(e) => {
                        setLabelWidthMm(Math.max(20, parseInt(e.target.value) || 20));
                        setPresetSize('custom');
                      }}
                      className="w-full py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 text-center"
                    />
                    <span className="text-xs text-slate-500 font-mono">مم</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    الارتفاع (Height):
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="15"
                      max="100"
                      value={labelHeightMm}
                      onChange={(e) => {
                        setLabelHeightMm(Math.max(15, parseInt(e.target.value) || 15));
                        setPresetSize('custom');
                      }}
                      className="w-full py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 text-center"
                    />
                    <span className="text-xs text-slate-500 font-mono">مم</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    عدد النسخ:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCopyCount((prev) => Math.max(1, prev - 1))}
                      className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={copyCount}
                      onChange={(e) => setCopyCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-black text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setCopyCount((prev) => prev + 1)}
                      className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    3. معاينة الملصق المباشرة (مطابق تماماً للمطبوع):
                  </label>
                  <span className="text-[11px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                    المقاس: {labelWidthMm} مم × {labelHeightMm} مم
                  </span>
                </div>

                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[160px]">
                  {selectedProduct ? (
                    <div
                      style={{
                        width: `${Math.min(320, labelWidthMm * 4.5)}px`,
                        minHeight: `${Math.min(220, labelHeightMm * 4.5)}px`,
                      }}
                      className="bg-white rounded-xl shadow-md p-2.5 text-center border-2 border-dashed border-slate-400 flex flex-col items-center justify-between transition-all"
                    >
                      {showStoreName && (
                        <div className="text-[10px] font-bold text-slate-500 truncate w-full">
                          {settings.storeName || 'المتجر العصري'}
                        </div>
                      )}
                      {showProductName && (
                        <div className="text-xs font-black text-slate-900 truncate w-full mt-0.5">
                          {selectedProduct.name}
                        </div>
                      )}
                      {showPrice && (
                        <div className="text-sm sm:text-base font-black text-emerald-800 font-mono tracking-tight my-0.5">
                          {selectedProduct.sellingPrice.toFixed(2)} {settings.currencySymbol}
                        </div>
                      )}

                      {/* SVG Barcode rendered dynamically */}
                      <div className="flex justify-center my-0.5 bg-white w-full">
                        <svg ref={barcodeSvgRef} className="max-w-full"></svg>
                      </div>

                      <div className="mt-1 flex items-center justify-center gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={handleCopyBarcode}
                          className="text-[10px] font-mono text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
                        >
                          {copiedSuccess ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">تم نسخ الرمز!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>نسخ رقم الباركود</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs py-8">
                      يرجى اختيار منتج لمعاينة ملصق الباركود
                    </div>
                  )}
                </div>
              </div>

              {/* Visibility Controls */}
              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProductName}
                    onChange={(e) => setShowProductName(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>اسم المنتج</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>السعر ({settings.currencySymbol})</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>اسم المحل</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcodeText}
                    onChange={(e) => setShowBarcodeText(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>أرقام الباركود تحت الخطوط</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            إلغاء
          </button>

          {selectedProduct && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>
                طباعة الآن على مقاس ({labelWidthMm} × {labelHeightMm} مم) - {copyCount} ملصق
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
