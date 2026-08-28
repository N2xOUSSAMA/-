import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, Volume2, AlertCircle } from 'lucide-react';
import { StorageService } from '../../services/storage';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasPermission(true);
      isScanningRef.current = true;
      initBarcodeDetection();
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setHasPermission(false);
      setErrorMsg('تعذر الوصول إلى الكاميرا أو تم رفض الإذن. يمكنك إدخال الباركود يدوياً أدناه.');
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const initBarcodeDetection = async () => {
    // Check if Shape Detection API (BarcodeDetector) is supported in modern Chrome / Android
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        });

        const scanFrame = async () => {
          if (!isScanningRef.current || !videoRef.current) return;
          try {
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const detected = barcodes[0].rawValue;
                handleCodeDetected(detected);
                return;
              }
            }
          } catch (e) {
            // frame detect error
          }
          if (isScanningRef.current) {
            requestAnimationFrame(scanFrame);
          }
        };

        requestAnimationFrame(scanFrame);
      } catch (e) {
        console.warn('Barcode detector not initialized:', e);
      }
    }
  };

  const handleCodeDetected = (code: string) => {
    if (!code) return;
    StorageService.playBeep();
    onScanSuccess(code.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">قارئ الباركود بالكاميرا</h3>
              <p className="text-[11px] text-slate-400">وجه الكاميرا نحو باركود المنتج</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Camera Area */}
        <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="relative w-64 h-36 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-md"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-md"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-md"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-md"></div>

              {/* Animated Laser line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
            </div>
          </div>

          {/* Flash / Status Badge */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            جاهز للمسح
          </div>

          {errorMsg && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-xs text-slate-300 mb-4">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode entry & Quick Barcode buttons */}
        <div className="p-4 bg-slate-800/60 border-t border-slate-700 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) handleCodeDetected(manualCode.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="أو اكتب الباركود يدوياً واضغط إدخال..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              تأكيد
            </button>
          </form>

          {/* Quick Demo Barcodes for instant testing */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">تجربة سريعة بأصناف موجودة:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'حليب 1L', code: '6130001001' },
                { name: 'كولا 330ml', code: '6130001003' },
                { name: 'شيبس 75g', code: '6130001007' },
                { name: 'زيت 1L', code: '6130001008' },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleCodeDetected(item.code)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  {item.name} ({item.code})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
