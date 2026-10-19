import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Package,
  Upload,
  RefreshCw,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
} from '@zxing/library';
import { useInventory } from '../context/InventoryContext.js';
import type { InventoryItem } from '../types/inventory.js';
import {
  findItemByBarcode,
  cleanBarcodeDigits,
  validateProductName,
  validatePrice,
  BARCODE_EXACT_LENGTH,
} from '../utils/inventoryLogic.js';
import { PriceDisplay, PesoSign } from './PriceDisplay.js';

type ScanModalType = null | 'existing_item' | 'new_item_confirm' | 'new_item_form';

export const ScanView: React.FC = () => {
  const { items, addStock, addItem, initialBarcodeForScan, setInitialBarcodeForScan, showToast } = useInventory();

  // Pop-up modal state: ONLY 'existing_item' (Add to existing inventory) or 'new_item_confirm'/'new_item_form' (Add to inventory)
  const [modalType, setModalType] = useState<ScanModalType>(null);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);

  // QR code warning state: "when a qr is spotted show a warning message that qr is not allowed"
  const [qrDetected, setQrDetected] = useState<boolean>(false);

  // Flow 1: Existing item quantity to add
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);

  // Flow 2: Add new product name and price details
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductSize, setNewProductSize] = useState<number>(100);
  const [newProductType, setNewProductType] = useState('Eau de Parfum');
  const [newProductGender, setNewProductGender] = useState('Unisex');
  const [newProductLocation, setNewProductLocation] = useState('Shelf A - Row 1');
  const [newProductInitialStock, setNewProductInitialStock] = useState<number>(5);

  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const scanLoopRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const ignoreUntilRef = useRef<number>(0);

  // Persistent reusable canvases for high-speed multi-pass barcode scanning
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contrastCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Native BarcodeDetector instance ref
  const nativeDetectorRef = useRef<any>(null);

  // ZXing reader instance ref
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const getZxingReader = useCallback(() => {
    if (!zxingReaderRef.current) {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new MultiFormatReader();
      reader.setHints(hints);
      zxingReaderRef.current = reader;
    }
    return zxingReaderRef.current;
  }, []);

  // Initialize native BarcodeDetector if supported in the browser
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
        });
      } catch {
        nativeDetectorRef.current = null;
      }
    }
  }, []);

  // Close the popup modal and resume scanning with a cooldown
  const closeModal = useCallback(() => {
    setModalType(null);
    setScannedCode('');
    setMatchedItem(null);
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
    isProcessingRef.current = false;
    ignoreUntilRef.current = Date.now() + 1200;
  }, []);

  // Process a recognized barcode string -> triggers the appropriate pop-up modal without any brand predictor
  const processBarcode = useCallback(
    async (rawCode: string) => {
      const cleanDigits = cleanBarcodeDigits(rawCode);
      if (!cleanDigits || isProcessingRef.current || Date.now() < ignoreUntilRef.current) return;
      isProcessingRef.current = true;
      setQrDetected(false);

      setScannedCode(cleanDigits);
      const existing = findItemByBarcode(items, cleanDigits);

      if (existing) {
        // Pop-up 1: "Add to existing inventory"
        setMatchedItem(existing);
        setQuantityToAdd(1);
        setModalType('existing_item');
      } else {
        // Pop-up 2: "Add to inventory" (clean fields, no automatic brand predictor)
        setMatchedItem(null);
        setNewProductName('');
        setNewProductPrice('');
        setNewProductBrand('');
        setNewProductSize(100);
        setNewProductType('Eau de Parfum');
        setNewProductGender('Unisex');
        setNewProductLocation('Shelf A - Row 1');
        setNewProductInitialStock(5);
        setModalType('new_item_confirm');
      }
    },
    [items]
  );

  // Decode a canvas with ZXing using GlobalHistogram and Hybrid binarizers
  const decodeCanvasWithZXing = useCallback(
    (canvas: HTMLCanvasElement): { isQr: boolean; text?: string } | null => {
      if (!canvas.width || !canvas.height) return null;
      const reader = getZxingReader();
      try {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);

        // Attempt 1: GlobalHistogramBinarizer (best for 1D retail barcodes)
        try {
          const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
          const result = reader.decode(bitmap);
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText() };
          }
        } catch {
          // Fall through to attempt 2
        } finally {
          reader.reset();
        }

        // Attempt 2: HybridBinarizer
        try {
          const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          const result = reader.decode(bitmap);
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText() };
          }
        } catch {
          //Fall through to attempt 3 (inverted luminance for dark/metallic packaging)
        } finally {
          reader.reset();
        }

        // Attempt 3: Inverted Luminance (handles light bars on dark/gold perfume boxes)
        try {
          const invertedSource = luminanceSource.invert();
          const bitmap = new BinaryBitmap(new HybridBinarizer(invertedSource));
          const result = reader.decode(bitmap);
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText() };
          }
        } catch {
          // Miss
        } finally {
          reader.reset();
        }
      } catch {
        // General decode miss
      }
      return null;
    },
    [getZxingReader]
  );

  // Process a live video frame with high-accuracy multi-pass pipeline
  const decodeVideoFrame = useCallback(async (): Promise<{ isQr: boolean; text?: string } | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // PASS 1: Native BarcodeDetector on full video element (hardware accelerated)
    if (nativeDetectorRef.current) {
      try {
        const detected = await nativeDetectorRef.current.detect(video);
        if (detected && detected.length > 0) {
          const first = detected[0];
          const isQr = first.format === 'qr_code' || String(first.format).toLowerCase().includes('qr');
          return { isQr, text: first.rawValue };
        }
      } catch {
        // Continue to canvas passes
      }
    }

    // PASS 2: Center Viewfinder Band Crop (eliminates background clutter around the 1D barcode)
    if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement('canvas');
    const cropCanvas = cropCanvasRef.current;
    const sx = Math.floor(vw * 0.08);
    const sy = Math.floor(vh * 0.22);
    const sw = Math.floor(vw * 0.84);
    const sh = Math.floor(vh * 0.56);
    const cropTargetW = Math.min(sw, 960);
    const cropTargetH = Math.max(1, Math.floor((sh * cropTargetW) / sw));
    if (cropCanvas.width !== cropTargetW) cropCanvas.width = cropTargetW;
    if (cropCanvas.height !== cropTargetH) cropCanvas.height = cropTargetH;

    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    if (cropCtx) {
      cropCtx.filter = 'none';
      cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cropTargetW, cropTargetH);

      if (nativeDetectorRef.current) {
        try {
          const detectedCrop = await nativeDetectorRef.current.detect(cropCanvas);
          if (detectedCrop && detectedCrop.length > 0) {
            const first = detectedCrop[0];
            const isQr = first.format === 'qr_code' || String(first.format).toLowerCase().includes('qr');
            return { isQr, text: first.rawValue };
          }
        } catch {
          // Continue
        }
      }

      const cropHit = decodeCanvasWithZXing(cropCanvas);
      if (cropHit) return cropHit;
    }

    // PASS 3: High-Contrast Sharpened Center Band (reads low-light, glossy cellophane, or low-contrast webcams)
    if (!contrastCanvasRef.current) contrastCanvasRef.current = document.createElement('canvas');
    const contrastCanvas = contrastCanvasRef.current;
    if (contrastCanvas.width !== cropTargetW) contrastCanvas.width = cropTargetW;
    if (contrastCanvas.height !== cropTargetH) contrastCanvas.height = cropTargetH;
    const contrastCtx = contrastCanvas.getContext('2d', { willReadFrequently: true });
    if (contrastCtx) {
      contrastCtx.filter = 'contrast(1.75) brightness(1.08) grayscale(1)';
      contrastCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cropTargetW, cropTargetH);
      const contrastHit = decodeCanvasWithZXing(contrastCanvas);
      if (contrastHit) return contrastHit;
    }

    // PASS 4: Full-frame ZXing decode
    if (!fullCanvasRef.current) fullCanvasRef.current = document.createElement('canvas');
    const fullCanvas = fullCanvasRef.current;
    const targetW = Math.min(vw, 900);
    const targetH = Math.max(1, Math.floor((vh * targetW) / vw));
    if (fullCanvas.width !== targetW) fullCanvas.width = targetW;
    if (fullCanvas.height !== targetH) fullCanvas.height = targetH;
    const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
    if (!fullCtx) return null;

    fullCtx.filter = 'none';
    fullCtx.drawImage(video, 0, 0, targetW, targetH);
    let hit = decodeCanvasWithZXing(fullCanvas);
    if (hit) return hit;

    // PASS 5: Rotated 90 degrees (in case user holds perfume barcode vertically)
    if (!rotCanvasRef.current) rotCanvasRef.current = document.createElement('canvas');
    const rotated = rotCanvasRef.current;
    if (rotated.width !== targetH) rotated.width = targetH;
    if (rotated.height !== targetW) rotated.height = targetW;
    const rotCtx = rotated.getContext('2d', { willReadFrequently: true });
    if (rotCtx) {
      rotCtx.save();
      rotCtx.translate(targetH / 2, targetW / 2);
      rotCtx.rotate(Math.PI / 2);
      rotCtx.drawImage(fullCanvas, -targetW / 2, -targetH / 2);
      rotCtx.restore();
      hit = decodeCanvasWithZXing(rotated);
      if (hit) return hit;
    }

    return null;
  }, [decodeCanvasWithZXing]);

  // Start Camera Stream with high-resolution & continuous autofocus constraints
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera stream not supported in this browser. Use photo upload or manual entry below.');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Enable continuous autofocus if the device camera supports it
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
        try {
          const caps: any = videoTrack.getCapabilities();
          if (caps?.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
            await videoTrack.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
          }
        } catch {
          // Ignore if advanced focus constraint is not supported
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const vid = videoRef.current;
        vid.srcObject = stream;
        vid.setAttribute('playsinline', 'true');
        vid.setAttribute('autoplay', 'true');
        vid.muted = true;

        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsCameraActive(true))
            .catch(() => {
              vid.onloadeddata = () => {
                vid.play().then(() => setIsCameraActive(true)).catch(() => {});
              };
            });
        }
      }
    } catch {
      setCameraError('Camera unavailable or permission denied. You can upload a photo or use manual barcode entry.');
      setIsCameraActive(false);
    }
  }, []);

  // Run camera lifecycle and fast scan loop
  useEffect(() => {
    if (initialBarcodeForScan) {
      processBarcode(initialBarcodeForScan);
      setInitialBarcodeForScan(null);
    }

    startCamera();

    let lastTick = 0;
    let isMounted = true;

    const scanLoop = async (time: number) => {
      if (!isMounted) return;

      // Scan every ~90ms (~11 FPS) for snappy barcode capture
      if (time - lastTick > 90) {
        lastTick = time;
        if (
          !isProcessingRef.current &&
          modalType === null &&
          Date.now() >= ignoreUntilRef.current
        ) {
          const hit = await decodeVideoFrame();
          if (hit && isMounted) {
            if (hit.isQr) {
              setQrDetected(true);
            } else if (hit.text) {
              setQrDetected(false);
              processBarcode(hit.text);
            }
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanLoop);
    };

    scanLoopRef.current = requestAnimationFrame(scanLoop);

    return () => {
      isMounted = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, processBarcode, modalType, decodeVideoFrame, initialBarcodeForScan, setInitialBarcodeForScan]);

  // Photo / Image File Upload Scanner with multi-pass enhancement
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const bmp = await createImageBitmap(file);

      // 1. Try native detector first on image bitmap
      if (nativeDetectorRef.current) {
        try {
          const detected = await nativeDetectorRef.current.detect(bmp);
          if (detected && detected.length > 0) {
            const first = detected[0];
            if (first.format === 'qr_code' || String(first.format).toLowerCase().includes('qr')) {
              setQrDetected(true);
              return;
            }
            processBarcode(first.rawValue);
            return;
          }
        } catch {
          // Fallback to ZXing
        }
      }

      // 2. Multi-pass ZXing on uploaded image (Normal, High-Contrast, Rotated)
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      const scale = bmp.width > maxDim ? maxDim / bmp.width : 1;
      canvas.width = Math.max(1, Math.floor(bmp.width * scale));
      canvas.height = Math.max(1, Math.floor(bmp.height * scale));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        // Normal pass
        ctx.filter = 'none';
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        let hit = decodeCanvasWithZXing(canvas);

        // High-contrast pass
        if (!hit) {
          ctx.filter = 'contrast(1.8) brightness(1.08) grayscale(1)';
          ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
          hit = decodeCanvasWithZXing(canvas);
        }

        // Rotated 90 deg pass
        if (!hit) {
          const rotCanvas = document.createElement('canvas');
          rotCanvas.width = canvas.height;
          rotCanvas.height = canvas.width;
          const rCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
          if (rCtx) {
            rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            rCtx.rotate(Math.PI / 2);
            rCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            hit = decodeCanvasWithZXing(rotCanvas);
          }
        }

        if (hit) {
          if (hit.isQr) {
            setQrDetected(true);
            return;
          }
          if (hit.text) {
            processBarcode(hit.text);
            return;
          }
        }
      }
      showToast('No barcode detected in uploaded photo. Please ensure barcode is clear or enter the digits below.');
    } catch {
      showToast('Failed to process image. Please try another photo or enter manually.');
    } finally {
      event.target.value = '';
    }
  };

  // Submit Handler: Add stock to existing item in inventory
  const handleAddStockConfirm = async () => {
    if (!matchedItem) return;
    const qty = Math.max(1, quantityToAdd);
    await addStock(matchedItem.id, qty);
    closeModal();
  };

  // Submit Handler: Save new product to inventory
  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValidation = validateProductName(newProductName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || 'Invalid product name');
      return;
    }

    const priceValidation = validatePrice(newProductPrice);
    if (!priceValidation.isValid) {
      setPriceError(priceValidation.error || 'Invalid price');
      return;
    }

    await addItem({
      name: nameValidation.sanitized,
      brand: newProductBrand.trim() || 'Generic Brand',
      type: newProductType,
      gender: newProductGender,
      size: newProductSize || 100,
      stock: Math.max(1, newProductInitialStock || 1),
      price: priceValidation.parsedPrice,
      location: newProductLocation.trim() || 'Shelf A - Row 1',
      barcode: scannedCode,
    });

    closeModal();
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-20 md:pb-6">
      {/* View Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#242119]">
          Scan Barcode
        </h2>
      </div>

      {/* QR CODE WARNING: Displayed whenever a QR code is spotted in the camera or photo */}
      {qrDetected && (
        <div className="p-3.5 bg-[#f8ede5] border border-[#ecdccf] rounded-xl text-[#a05539] text-xs font-semibold flex items-center justify-between gap-2.5 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#a05539]" />
            <span>QR code detected — QR codes are not allowed. Please scan a 13-digit product barcode.</span>
          </div>
          <button
            onClick={() => setQrDetected(false)}
            className="p-1 hover:bg-[#ecdccf] rounded text-[#a05539]"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Scanner Section (Live Camera Viewfinder) */}
      <div className="bg-white border border-[#e7e2d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Live Camera Viewfinder */}
        <div className="relative aspect-16/10 w-full bg-[#1b1915] rounded-xl overflow-hidden border border-[#e7e2d4] flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Active Viewfinder Target Box */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-4/5 sm:w-2/3 h-1/2 border-2 border-dashed border-[#efeadc]/90 rounded-xl relative flex items-center justify-center shadow-inner">
              {/* Laser guideline */}
              <div className="w-full h-0.5 bg-[#9c8f6f] shadow-[0_0_8px_#9c8f6f] animate-pulse absolute" />
            </div>
            <span className="mt-3 px-3 py-1 rounded-full bg-black/70 text-[11px] font-mono text-white tracking-wide">
              Align 13-digit barcode in frame
            </span>
          </div>

          {/* Camera Controls Overlay */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={startCamera}
              title="Restart Camera"
              className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Camera error fallback overlay */}
          {cameraError && (
            <div className="absolute inset-0 bg-[#faf8f4]/95 p-4 flex flex-col items-center justify-center text-center z-20">
              <AlertTriangle className="w-7 h-7 text-[#9c793c] mb-2" />
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

        {/* Action Toolbar: Upload Image Option + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Photo File Upload Button */}
          <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#faf8f4] hover:bg-[#f2efe6] border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#242119] cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#7c7156]" />
            <span>Upload Barcode Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          {/* Status Indicator */}
          <div className="flex items-center justify-center sm:justify-start px-3.5 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs text-[#56534a]">
            <span className={`w-2 h-2 rounded-full mr-2 ${isCameraActive ? 'bg-[#57795c]' : 'bg-[#9c793c]'}`} />
            <span>{isCameraActive ? 'Camera scanner active' : 'Camera stream initializing...'}</span>
          </div>
        </div>

        {/* Manual Barcode Entry (Strictly capped at 13 Digits) */}
        <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
            Manual Barcode Entry (Max 13 Digits)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={BARCODE_EXACT_LENGTH}
              value={manualCode}
              onChange={(e) => {
                setManualCode(cleanBarcodeDigits(e.target.value));
                setManualError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (manualCode.trim()) processBarcode(manualCode.trim());
                }
              }}
              placeholder="e.g. 3145891265478"
              className="flex-1 px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
            <button
              type="button"
              onClick={() => {
                if (!manualCode.trim()) {
                  setManualError('Enter a barcode number');
                  return;
                }
                processBarcode(manualCode.trim());
              }}
              className="px-4 py-2 bg-[#9c8f6f] hover:bg-[#7c7156] text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> ADD
            </button>
          </div>
          {manualError && <p className="text-xs text-[#a05539] font-medium">{manualError}</p>}
        </div>
      </div>

      {/* =========================================================================
          POP-UP MODAL 1: "Add to Existing Inventory"
          Brought back in the scan menu, strictly for adding stock to existing item!
         ========================================================================= */}
      {modalType === 'existing_item' && matchedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#7c7156]" />
                <h3 className="font-serif text-base font-bold text-[#242119]">
                  Add to Existing Inventory
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Product Info Card */}
              <div className="p-3.5 bg-[#eef2ec] border border-[#c9d8c5] rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#57795c] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif font-bold text-base text-[#242119] truncate">
                    {matchedItem.name}
                  </h4>
                  <div className="text-xs text-[#56534a] mt-0.5">
                    {matchedItem.brand} · {matchedItem.size} mL · Barcode:{' '}
                    <span className="font-mono font-bold text-[#242119]">{matchedItem.barcode}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#57795c] mt-1.5 flex items-center gap-2">
                    <span>Current Stock: {matchedItem.stock} pcs</span>
                    <span>·</span>
                    <span className="flex items-center">
                      Price: <PriceDisplay amount={matchedItem.price} className="ml-1 font-bold" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Counter Prompt */}
              <div className="space-y-2.5 text-center pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  How many would you like to add to our existing inventory?
                </label>

                <div className="flex items-center justify-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantityToAdd((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d4] hover:bg-[#f2efe6] flex items-center justify-center text-[#242119] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantityToAdd}
                    onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 text-center py-2 text-xl font-bold font-mono bg-white border border-[#e7e2d4] rounded-lg text-[#242119]"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantityToAdd((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d4] hover:bg-[#f2efe6] flex items-center justify-center text-[#242119] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Add Chips */}
                <div className="flex justify-center gap-2">
                  {[1, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuantityToAdd(num)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                        quantityToAdd === num
                          ? 'bg-[#242119] text-white border-[#242119]'
                          : 'bg-white text-[#56534a] border-[#e7e2d4] hover:bg-[#f2efe6]'
                      }`}
                    >
                      +{num}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-[#8c8878] pt-1">
                  New stock total: <strong className="text-[#242119]">{matchedItem.stock + quantityToAdd} pcs</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddStockConfirm}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#242119] hover:bg-[#34302a] text-white transition-colors shadow-xs"
                >
                  Add Stock (+{quantityToAdd})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POP-UP MODAL 2A: "Add to Inventory" Confirmation
          Brought back in the scan menu, strictly for adding new barcode to inventory!
         ========================================================================= */}
      {modalType === 'new_item_confirm' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#7c7156]" />
                <h3 className="font-serif text-base font-bold text-[#242119]">
                  Add to Inventory
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#f6f0e1] text-[#9c793c] flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-mono text-[#8c8878] uppercase">
                  Scanned Barcode: <strong className="text-[#242119]">{scannedCode}</strong>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#242119]">
                  Would you like to add to inventory?
                </h3>
                <p className="text-xs text-[#56534a] max-w-sm mx-auto">
                  This barcode is not currently in our store inventory. Click "Yes, Add" to enter product details.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('new_item_form')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#9c8f6f] hover:bg-[#7c7156] text-white transition-colors shadow-xs"
                >
                  Yes, Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POP-UP MODAL 2B: "Add to Inventory" Details Form
          Allows entering product name, sleek price, brand, size, initial stock!
         ========================================================================= */}
      {modalType === 'new_item_form' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#7c7156]" />
                <h3 className="font-serif text-base font-bold text-[#242119]">
                  Add to Inventory
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateProductSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#e7e2d4]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8878]">Barcode</span>
                  <div className="font-mono text-xs font-bold text-[#242119]">{scannedCode}</div>
                </div>
                <span className="text-xs px-2.5 py-0.5 bg-[#efeadc] text-[#7c7156] rounded-full font-semibold">
                  New Product
                </span>
              </div>

              {/* Product Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  Fragrance Name <span className="text-[#a05539]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => {
                    setNewProductName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="e.g. Bleu de Chanel, Aventus"
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-serif font-bold text-[#242119] focus:outline-none focus:ring-2 ${
                    nameError ? 'border-[#a05539] ring-[#a05539]/20' : 'border-[#e7e2d4] ring-[#9c8f6f]'
                  }`}
                />
                {nameError && <p className="text-xs text-[#a05539] font-medium">{nameError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Price Details with sleek, smaller Peso sign */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Price (<PesoSign />) <span className="text-[#a05539]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-[#8c8878] font-normal pointer-events-none">
                      ₱
                    </span>
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
                      className={`w-full pl-7 pr-3 py-2 bg-white border rounded-xl text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 ${
                        priceError ? 'border-[#a05539] ring-[#a05539]/20' : 'border-[#e7e2d4] ring-[#9c8f6f]'
                      }`}
                    />
                  </div>
                  {priceError && <p className="text-xs text-[#a05539] font-medium">{priceError}</p>}
                </div>

                {/* Brand / Category */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Brand
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductBrand}
                    onChange={(e) => setNewProductBrand(e.target.value)}
                    placeholder="e.g. Creed"
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>

                {/* Initial Stock */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductInitialStock}
                    onChange={(e) => setNewProductInitialStock(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#242119]"
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
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#242119]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Gender Option */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Gender
                  </label>
                  <select
                    value={newProductGender}
                    onChange={(e) => setNewProductGender(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Women">Women</option>
                    <option value="Men">Men</option>
                  </select>
                </div>

                {/* Shelf Location */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                    Shelf Location
                  </label>
                  <input
                    type="text"
                    value={newProductLocation}
                    onChange={(e) => setNewProductLocation(e.target.value)}
                    placeholder="e.g. Shelf A - Row 1"
                    className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={() => setModalType('new_item_confirm')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#242119] text-white hover:bg-[#34302a] transition-colors shadow-xs"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
