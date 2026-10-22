import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Package,
  ArrowRight,
  Upload,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
} from '@zxing/library';
import { useInventory } from '../context/InventoryContext.js';
import type { InventoryItem, ScanFlowStep } from '../types/inventory.js';
import {
  findItemByBarcode,
  validateProductName,
  validatePrice,
  cleanBarcodeDigits,
  validateBarcode13Digits,
  formatCurrency,
  BARCODE_EXACT_LENGTH,
  evaluateBarcodeConsensus,
  enhanceBarcodeLuminance,
  type BarcodeFrameSample,
} from '../utils/inventoryLogic.js';
import { lookupProductDetails, type LookupResult } from '../utils/lookup.js';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetBarcode?: string | null;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  presetBarcode,
}) => {
  const { items, addStock, addItem } = useInventory();

  // Scanning state
  const [step, setStep] = useState<ScanFlowStep>('camera_active');
  const [scannedCode, setScannedCode] = useState<string>('');
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);

  // QR code detected warning
  const [qrDetected, setQrDetected] = useState<boolean>(false);

  // Existing item flow state
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);

  // New item flow state (when user clicks "Yes" to "Would you like to add to inventory?")
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductSize, setNewProductSize] = useState<number>(100);
  const [newProductType, setNewProductType] = useState('Eau de Parfum');
  const [newProductGender, setNewProductGender] = useState('Unisex');
  const [newProductLocation, setNewProductLocation] = useState('Shelf A - Row 1');
  const [newProductInitialStock, setNewProductInitialStock] = useState<number>(5);

  // Validation & helper alerts
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [lookupInfo, setLookupInfo] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Manual input state (max 13 digits)
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Camera video refs & stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scanLoopRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const ignoreUntilRef = useRef<number>(0);
  const frameSamplesRef = useRef<BarcodeFrameSample[]>([]);

  // ZXing reader instance setup with retail barcode formats & QR detection
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const getZxingReader = () => {
    if (!zxingReaderRef.current) {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_8,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new MultiFormatReader();
      reader.setHints(hints);
      zxingReaderRef.current = reader;
    }
    return zxingReaderRef.current;
  };

  // Reset and clean up
  const resetFlow = useCallback(() => {
    frameSamplesRef.current = [];
    setStep('camera_active');
    setScannedCode('');
    setMatchedItem(null);
    setQrDetected(false);
    setQuantityToAdd(1);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductBrand('');
    setNewProductSize(100);
    setNewProductType('Eau de Parfum');
    setNewProductGender('Unisex');
    setNewProductLocation('Shelf A - Row 1');
    setNewProductInitialStock(5);
    setNameError(null);
    setPriceError(null);
    setLookupInfo(null);
    isProcessingRef.current = false;
    ignoreUntilRef.current = Date.now() + 1200;
  }, []);

  // Process a scanned or entered barcode
  const handleBarcodeDetected = useCallback(
    async (rawCode: string) => {
      const cleanDigits = cleanBarcodeDigits(rawCode);
      if (!cleanDigits || isProcessingRef.current || Date.now() < ignoreUntilRef.current) return;
      isProcessingRef.current = true;
      frameSamplesRef.current = [];
      setQrDetected(false);

      const existing = findItemByBarcode(items, cleanDigits);
      const canonical = existing ? cleanBarcodeDigits(existing.barcode) : cleanDigits;
      setScannedCode(canonical);

      if (existing) {
        // CASE 1: Found in existing inventory -> Show how many to add popup
        setMatchedItem(existing);
        setQuantityToAdd(1);
        setStep('prompt_existing_quantity');
      } else {
        // CASE 2: Not in inventory -> Show "Would you like to add to inventory?" popup
        setMatchedItem(null);
        setStep('prompt_confirm_add_new');

        setIsLookingUp(true);
        lookupProductDetails(canonical).then((result: LookupResult | null) => {
          setIsLookingUp(false);
          if (result && result.fields) {
            setLookupInfo(`Online match found from ${result.source}`);
            if (result.fields.name) setNewProductName(result.fields.name);
            if (result.fields.brand) setNewProductBrand(result.fields.brand);
            if (result.fields.size) setNewProductSize(result.fields.size);
            if (result.fields.type) setNewProductType(result.fields.type);
            if (result.fields.gender) setNewProductGender(result.fields.gender);
          }
        });
      }
    },
    [items]
  );

  // Decode frame using multi-pass ZXing + adaptive luminance stretch
  const decodeVideoFrame = useCallback((): { isQr: boolean; text?: string } | null => {
    if (!videoRef.current || videoRef.current.readyState < 2 || !videoRef.current.videoWidth) {
      return null;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const sx = Math.floor(vw * 0.08);
    const sy = Math.floor(vh * 0.3);
    const sw = Math.floor(vw * 0.84);
    const sh = Math.floor(vh * 0.4);
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    const reader = getZxingReader();
    try {
      const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
      for (const bin of [
        new GlobalHistogramBinarizer(luminanceSource),
        new HybridBinarizer(luminanceSource),
      ]) {
        try {
          const result = reader.decode(new BinaryBitmap(bin));
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText() };
          }
        } catch {
          // Try next
        } finally {
          reader.reset();
        }
      }

      // Adaptive luminance normalizer + 1D horizontal unsharp mask pass
      const imgData = ctx.getImageData(0, 0, sw, sh);
      const enhanced = enhanceBarcodeLuminance(imgData.data, sw, sh, true);
      const rgbSource = new RGBLuminanceSource(enhanced, sw, sh);
      const result = reader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(rgbSource)));
      if (result) {
        const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
        return { isQr, text: result.getText() };
      }
    } catch {
      // Nothing decoded in this frame
    } finally {
      reader.reset();
    }

    return null;
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    frameSamplesRef.current = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported. Use photo upload or manual entry below.');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError('Camera access unavailable. You can upload a photo or enter a barcode manually.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Continuous Camera Scan Loop with Multi-Frame Consensus Lock
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetFlow();
      return;
    }

    if (presetBarcode) {
      handleBarcodeDetected(presetBarcode);
      return;
    }

    startCamera();

    let lastTick = 0;
    const scanLoop = (time: number) => {
      if (time - lastTick > 80) {
        lastTick = time;
        if (
          !isProcessingRef.current &&
          step === 'camera_active' &&
          Date.now() >= ignoreUntilRef.current
        ) {
          const hit = decodeVideoFrame();
          const now = Date.now();
          frameSamplesRef.current = frameSamplesRef.current.filter((s) => now - s.timestamp <= 950);

          if (hit) {
            if (hit.isQr) {
              setQrDetected(true);
            } else if (hit.text) {
              setQrDetected(false);
              frameSamplesRef.current.push({ code: hit.text, timestamp: now });
              const consensus = evaluateBarcodeConsensus(frameSamplesRef.current, items, now, 950);
              if (consensus.locked && consensus.code) {
                handleBarcodeDetected(consensus.code);
              }
            }
          }
        }
      }
      scanLoopRef.current = requestAnimationFrame(scanLoop);
    };

    scanLoopRef.current = requestAnimationFrame(scanLoop);

    return () => {
      stopCamera();
    };
  }, [isOpen, presetBarcode, startCamera, stopCamera, step, decodeVideoFrame, handleBarcodeDetected, resetFlow, items]);

  // Handle Photo File Upload decoding
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bmp, 0, 0);
        try {
          const reader = getZxingReader();
          const lum = new HTMLCanvasElementLuminanceSource(canvas);
          const bmpImg = new BinaryBitmap(new HybridBinarizer(lum));
          const res = reader.decode(bmpImg);
          if (res) {
            if (res.getBarcodeFormat() === BarcodeFormat.QR_CODE) {
              setQrDetected(true);
              return;
            }
            handleBarcodeDetected(res.getText());
            return;
          }
        } catch {
          // fallback
        }
      }
      alert('No barcode detected in photo. Please ensure barcode is clear or type it below.');
    } catch {
      alert('Error reading uploaded image.');
    }
  };

  const handleConfirmAddStock = async () => {
    if (!matchedItem) return;
    await addStock(matchedItem.id, quantityToAdd);
    setStep('success_feedback');
  };

  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameCheck = validateProductName(newProductName);
    if (!nameCheck.isValid) {
      setNameError(nameCheck.error || 'Invalid product name');
      return;
    }
    setNameError(null);

    const priceCheck = validatePrice(newProductPrice);
    if (!priceCheck.isValid) {
      setPriceError(priceCheck.error || 'Enter a valid price');
      return;
    }
    setPriceError(null);

    const barcodeCheck = validateBarcode13Digits(scannedCode);
    if (!barcodeCheck.isValid) {
      alert(barcodeCheck.error);
      return;
    }

    await addItem({
      name: nameCheck.sanitized,
      brand: newProductBrand.trim() || 'Retail Brand',
      type: newProductType,
      gender: newProductGender,
      size: Number(newProductSize) || 100,
      stock: Number(newProductInitialStock) || 1,
      price: priceCheck.parsedPrice,
      location: newProductLocation.trim() || 'Shelf A - Row 1',
      barcode: barcodeCheck.sanitized,
    });

    setStep('success_feedback');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-[#ffffff] border border-[#e7e2d4] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header (Notice: 'Real-time camera & stock sync' is removed as requested) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#efeadc] flex items-center justify-center text-[#7c7156]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 id="scanner-modal-title" className="font-serif text-lg font-bold text-[#242119]">
                Barcode Scanner
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f2efe6] text-[#56534a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* QR CODE WARNING: Displayed whenever a QR code is spotted in the camera */}
          {qrDetected && (
            <div className="p-3 bg-[#f8ede5] border border-[#ecdccf] rounded-xl text-[#a05539] text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#a05539]" />
              <span>QR code detected — this scanner reads product barcodes only. No QR support.</span>
            </div>
          )}

          {/* STEP 1: ACTIVE CAMERA VIEW */}
          {step === 'camera_active' && (
            <div className="space-y-4">
              {/* Camera Frame */}
              <div className="relative aspect-16/10 w-full bg-[#1e1b15] rounded-xl overflow-hidden border border-[#e7e2d4] flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-4/5 h-3/5 border-2 border-dashed border-[#efeadc] rounded-lg relative flex items-center justify-center shadow-inner">
                    <div className="w-full h-0.5 bg-[#9c8f6f]/80 animate-pulse absolute" />
                  </div>
                  <span className="mt-3 px-3 py-1 rounded-full bg-black/60 text-xs font-mono text-[#faf8f4] tracking-wide">
                    Align product barcode in frame
                  </span>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-[#faf8f4]/95 p-4 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-8 h-8 text-[#9c793c] mb-2" />
                    <p className="text-xs text-[#56534a] max-w-xs">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#242119] text-white rounded-lg hover:bg-[#34302a]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Upload photo fallback */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 text-xs font-semibold text-[#56534a] border border-[#e7e2d4] hover:bg-[#faf8f4] rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Scan from Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Manual Barcode Input (Strict 13 Digits) */}
              <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  Manual Barcode Entry (Max 13 Digits)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(cleanBarcodeDigits(e.target.value));
                      setManualError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (manualInput.trim()) handleBarcodeDetected(manualInput.trim());
                      }
                    }}
                    placeholder="e.g. 3145891265478"
                    className="flex-1 px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!manualInput.trim()) {
                        setManualError('Please type a barcode number');
                        return;
                      }
                      handleBarcodeDetected(manualInput.trim());
                    }}
                    className="px-4 py-2 bg-[#9c8f6f] hover:bg-[#7c7156] text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> ADD
                  </button>
                </div>
                {manualError && <p className="text-xs text-[#a05539] font-medium">{manualError}</p>}
              </div>

              {/* Quick Sample Picks for Immediate Demo / Test */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8c8878]">
                  Quick Pick Test Barcodes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBarcodeDetected('3145891265478')}
                    className="px-2.5 py-1 text-xs font-mono bg-[#f2efe6] hover:bg-[#efeadc] text-[#242119] rounded-md border border-[#e7e2d4]"
                  >
                    Chanel (In Inventory)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBarcodeDetected('3348901250158')}
                    className="px-2.5 py-1 text-xs font-mono bg-[#f2efe6] hover:bg-[#efeadc] text-[#242119] rounded-md border border-[#e7e2d4]"
                  >
                    Dior (In Inventory)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBarcodeDetected('7501031311309')}
                    className="px-2.5 py-1 text-xs font-mono bg-[#efeadc] hover:bg-[#e7e2d4] text-[#7c7156] font-semibold rounded-md border border-[#9c8f6f]"
                  >
                    New Barcode (Not in Inventory)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrDetected(true)}
                    className="px-2.5 py-1 text-xs font-mono bg-[#f8ede5] hover:bg-[#ecdccf] text-[#a05539] font-semibold rounded-md border border-[#ecdccf]"
                  >
                    Test QR Code Warning
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNED ITEM FOUND IN INVENTORY -> QUANTITY POP-UP */}
          {step === 'prompt_existing_quantity' && matchedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-[#eef2ec] border border-[#c9d8c5] rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#57795c] shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm text-[#242119]">
                  <div className="font-bold text-base font-serif">{matchedItem.name}</div>
                  <div className="text-xs text-[#56534a]">
                    Brand: <span className="font-semibold">{matchedItem.brand}</span> · Size: {matchedItem.size} mL
                  </div>
                  <div className="text-xs font-mono text-[#7c7156]">
                    Barcode: {matchedItem.barcode}
                  </div>
                  <div className="text-xs font-medium text-[#57795c]">
                    Currently on shelf: <strong className="text-sm">{matchedItem.stock} pcs</strong> · Price: {formatCurrency(matchedItem.price)}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper Input */}
              <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  How many would you like to add to our existing inventory?
                </label>

                <div className="flex items-center justify-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => setQuantityToAdd((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d4] flex items-center justify-center text-[#242119] hover:bg-[#f2efe6] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={quantityToAdd}
                    onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 text-center py-2 px-2 text-xl font-bold font-mono bg-white border border-[#e7e2d4] rounded-lg text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantityToAdd((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d4] flex items-center justify-center text-[#242119] hover:bg-[#f2efe6] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex justify-center gap-2">
                  {[1, 5, 10, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantityToAdd(preset)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        quantityToAdd === preset
                          ? 'bg-[#242119] text-white border-[#242119]'
                          : 'bg-white text-[#56534a] border-[#e7e2d4] hover:bg-[#f2efe6]'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>

                <div className="text-center text-xs text-[#8c8878]">
                  New total stock will be: <strong className="text-[#242119]">{matchedItem.stock + quantityToAdd} pcs</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetFlow}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddStock}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#242119] hover:bg-[#34302a] text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Stock
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: NOT IN INVENTORY -> "Would you like to add to inventory?" */}
          {step === 'prompt_confirm_add_new' && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-[#f6f0e1] border border-[#e5d8b8] rounded-xl flex items-start gap-3">
                <Package className="w-6 h-6 text-[#9c793c] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-base text-[#242119]">
                    Product not in inventory
                  </h3>
                  <p className="text-xs text-[#56534a]">
                    No existing product was found with this barcode number:
                  </p>
                  <p className="font-mono text-sm font-bold text-[#7c7156] py-0.5">
                    {scannedCode}
                  </p>
                </div>
              </div>

              {isLookingUp && (
                <div className="text-xs text-[#8c8878] flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-[#9c8f6f]" /> Checking product databases online...
                </div>
              )}

              {lookupInfo && (
                <div className="p-2.5 bg-[#efeadc] text-[#7c7156] text-xs rounded-lg font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{lookupInfo} (details will be pre-filled for you)</span>
                </div>
              )}

              <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-center space-y-2">
                <p className="text-base font-serif font-semibold text-[#242119]">
                  Would you like to add to inventory?
                </p>
                <p className="text-xs text-[#8c8878]">
                  Clicking "Yes" will prompt you to enter the product name and price details.
                </p>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetFlow}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  No, Keep Scanning
                </button>
                <button
                  type="button"
                  onClick={() => setStep('prompt_enter_details')}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#9c8f6f] hover:bg-[#7c7156] text-white transition-colors flex items-center justify-center gap-2"
                >
                  <span>Yes, Add to Inventory</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PROMPT FOR PRODUCT NAME AND PRICE DETAILS */}
          {step === 'prompt_enter_details' && (
            <form onSubmit={handleSaveNewProduct} className="space-y-4">
              <div className="p-3 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8878]">Barcode (13 Digits)</span>
                  <div className="font-mono text-xs font-bold text-[#242119]">{scannedCode}</div>
                </div>
                <span className="text-xs px-2.5 py-1 bg-[#efeadc] text-[#7c7156] rounded-full font-semibold">
                  New Product
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. PRODUCT NAME (PRIMARY PROMPT) */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Product Name <span className="text-[#a05539]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductName}
                    onChange={(e) => {
                      setNewProductName(e.target.value);
                      setNameError(null);
                    }}
                    placeholder="e.g. Tom Ford Noir Extreme"
                    className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-[#242119] focus:outline-none focus:ring-2 ${
                      nameError ? 'border-[#a05539] ring-[#a05539]/20' : 'border-[#e7e2d4] ring-[#9c8f6f]'
                    }`}
                  />
                  {nameError && <p className="text-xs text-[#a05539] font-medium">{nameError}</p>}
                </div>

                {/* 2. PRICE DETAILS (PRIMARY PROMPT) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Price Details (₱) <span className="text-[#a05539]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-[#8c8878] font-bold font-sans">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={newProductPrice}
                      onChange={(e) => {
                        setNewProductPrice(e.target.value);
                        setPriceError(null);
                      }}
                      placeholder="0.00"
                      className={`w-full pl-7 pr-3 py-2 bg-white border rounded-lg text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 ${
                        priceError ? 'border-[#a05539] ring-[#a05539]/20' : 'border-[#e7e2d4] ring-[#9c8f6f]'
                      }`}
                    />
                  </div>
                  {priceError && <p className="text-xs text-[#a05539] font-medium">{priceError}</p>}
                </div>

                {/* Brand / Category */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Brand / Category
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    placeholder="e.g. Tom Ford"
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>

                {/* Initial Stock Quantity */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductInitialStock}
                    onChange={(e) => setNewProductInitialStock(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>

                {/* Size (mL) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Size (mL)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductSize}
                    onChange={(e) => setNewProductSize(parseInt(e.target.value, 10) || 100)}
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Type
                  </label>
                  <select
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  >
                    <option>Eau de Parfum</option>
                    <option>Eau de Toilette</option>
                    <option>Cologne</option>
                    <option>Perfume Oil</option>
                    <option>Eau Fraiche</option>
                  </select>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Shelf Location
                  </label>
                  <input
                    type="text"
                    value={newProductLocation}
                    onChange={(e) => setNewProductLocation(e.target.value)}
                    placeholder="e.g. Shelf C - Row 1"
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2.5 pt-3 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={() => setStep('prompt_confirm_add_new')}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#242119] hover:bg-[#34302a] text-white transition-colors"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: SUCCESS FEEDBACK */}
          {step === 'success_feedback' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-[#eef2ec] text-[#57795c] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-[#242119]">
                  Inventory Updated!
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={resetFlow}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#9c8f6f] hover:bg-[#7c7156] text-white transition-colors"
                >
                  Scan Another Item
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
