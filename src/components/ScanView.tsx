import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Package,
  Upload,
  RefreshCw,
  X,
  Layers,
  Focus,
  Zap,
  ShieldCheck,
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
import type { InventoryItem, StockAdjustmentReason } from '../types/inventory.js';
import {
  findItemByBarcode,
  cleanBarcodeDigits,
  validateProductName,
  validatePrice,
  BARCODE_EXACT_LENGTH,
  evaluateBarcodeConsensus,
  enhanceBarcodeLuminance,
  type BarcodeFrameSample,
  type BarcodeConsensusResult,
} from '../utils/inventoryLogic.js';
import { PriceDisplay, PesoSign } from './PriceDisplay.js';

type ScanModalType = null | 'existing_item' | 'new_item_confirm' | 'new_item_form';

const SCAN_ADD_REASONS: StockAdjustmentReason[] = [
  'New Delivery / Restock',
  'Customer Return',
  'Inventory Audit Correction',
];

export const ScanView: React.FC = () => {
  const { items, addStock, addItem, initialBarcodeForScan, setInitialBarcodeForScan, showToast } = useInventory();

  // Pop-up modal state
  const [modalType, setModalType] = useState<ScanModalType>(null);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);

  // QR code warning state
  const [qrDetected, setQrDetected] = useState<boolean>(false);

  // Flow 1: Existing item quantity & reason to add
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [stockReason, setStockReason] = useState<StockAdjustmentReason>('New Delivery / Restock');

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

  // Camera stream & hardware controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraResolution, setCameraResolution] = useState<string>('');
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [isRefocusing, setIsRefocusing] = useState<boolean>(false);

  // Multi-frame consensus & processing state
  const scanLoopRef = useRef<number | null>(null);
  const processTimerRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const ignoreUntilRef = useRef<number>(0);
  const frameSamplesRef = useRef<BarcodeFrameSample[]>([]);
  const [consensusState, setConsensusState] = useState<BarcodeConsensusResult | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);
  const [processingBarcodeText, setProcessingBarcodeText] = useState<string>('');

  // Persistent reusable canvases for 6-stage high-precision barcode pipeline
  const laserStripCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const upscaleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Native BarcodeDetector instance ref
  const nativeDetectorRef = useRef<any>(null);

  // ZXing reader instance ref (restricted to genuine retail barcode formats to eliminate ITF/UPC-E partial noise)
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const getZxingReader = useCallback(() => {
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
  }, []);

  // Initialize native BarcodeDetector if supported in the browser
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'upc_a', 'code_128', 'ean_8', 'qr_code'],
        });
      } catch {
        nativeDetectorRef.current = null;
      }
    }
  }, []);

  // Close the popup modal and resume scanning with a clean consensus buffer
  const closeModal = useCallback(() => {
    if (processTimerRef.current) {
      window.clearTimeout(processTimerRef.current);
      processTimerRef.current = null;
    }
    frameSamplesRef.current = [];
    setConsensusState(null);
    setIsProcessingScan(false);
    setProcessingBarcodeText('');
    setModalType(null);
    setScannedCode('');
    setMatchedItem(null);
    setQuantityToAdd(1);
    setStockReason('New Delivery / Restock');
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
    ignoreUntilRef.current = Date.now() + 1600;
  }, []);

  // Process a verified barcode string -> triggers the appropriate pop-up modal
  const processBarcode = useCallback(
    async (rawCode: string, immediate: boolean = false) => {
      const cleanDigits = cleanBarcodeDigits(rawCode);
      if (!cleanDigits || isProcessingRef.current || Date.now() < ignoreUntilRef.current) return;
      isProcessingRef.current = true;
      frameSamplesRef.current = [];
      setConsensusState(null);
      setQrDetected(false);
      setIsProcessingScan(true);
      setProcessingBarcodeText(cleanDigits);

      if (processTimerRef.current) {
        window.clearTimeout(processTimerRef.current);
      }

      const delayMs = immediate ? 350 : 650;

      processTimerRef.current = window.setTimeout(() => {
        setIsProcessingScan(false);
        setProcessingBarcodeText('');
        const existing = findItemByBarcode(items, cleanDigits);
        const canonicalCode = existing ? cleanBarcodeDigits(existing.barcode) : cleanDigits;
        setScannedCode(canonicalCode);

        if (existing) {
          setMatchedItem(existing);
          setQuantityToAdd(1);
          setStockReason('New Delivery / Restock');
          setModalType('existing_item');
        } else {
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
      }, delayMs);
    },
    [items]
  );

  // Decode a grayscale Uint8ClampedArray buffer directly with ZXing (GlobalHistogram + Hybrid + Inverted)
  const decodeGrayBufferWithZXing = useCallback(
    (gray: Uint8ClampedArray, width: number, height: number): { isQr: boolean; text?: string; format?: string } | null => {
      if (!width || !height) return null;
      const reader = getZxingReader();
      try {
        const source = new RGBLuminanceSource(gray, width, height);

        // Attempt 1: GlobalHistogramBinarizer (highest accuracy for 1D retail barcodes)
        try {
          const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(source));
          const result = reader.decode(bitmap);
          if (result) {
            const fmt = String(result.getBarcodeFormat());
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText(), format: fmt };
          }
        } catch {
          // Next
        } finally {
          reader.reset();
        }

        // Attempt 2: HybridBinarizer (handles uneven shadow/glare gradients across cellophane)
        try {
          const bitmap = new BinaryBitmap(new HybridBinarizer(source));
          const result = reader.decode(bitmap);
          if (result) {
            const fmt = String(result.getBarcodeFormat());
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText(), format: fmt };
          }
        } catch {
          // Next
        } finally {
          reader.reset();
        }
      } catch {
        // Miss
      }
      return null;
    },
    [getZxingReader]
  );

  // Decode a canvas with ZXing using GlobalHistogram, Hybrid, and Inverted binarizers
  const decodeCanvasWithZXing = useCallback(
    (canvas: HTMLCanvasElement, includeAdaptivePass: boolean = false): { isQr: boolean; text?: string; format?: string } | null => {
      if (!canvas.width || !canvas.height) return null;
      const reader = getZxingReader();
      try {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);

        // Attempt 1: GlobalHistogramBinarizer
        try {
          const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
          const result = reader.decode(bitmap);
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText(), format: String(result.getBarcodeFormat()) };
          }
        } catch {
          // Fall through
        } finally {
          reader.reset();
        }

        // Attempt 2: HybridBinarizer
        try {
          const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          const result = reader.decode(bitmap);
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText(), format: String(result.getBarcodeFormat()) };
          }
        } catch {
          // Fall through
        } finally {
          reader.reset();
        }

        // Attempt 3: Inverted Luminance (handles light/metallic gold bars on dark luxury perfume boxes)
        try {
          const invertedSource = luminanceSource.invert();
          const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(invertedSource));
          const result = reader.decode(bitmap);
          if (result) {
            const isQr = result.getBarcodeFormat() === BarcodeFormat.QR_CODE;
            return { isQr, text: result.getText(), format: String(result.getBarcodeFormat()) };
          }
        } catch {
          // Miss
        } finally {
          reader.reset();
        }

        // Attempt 4: Adaptive 5th-95th Percentile Contrast Stretch + 1D Horizontal Unsharp Mask
        if (includeAdaptivePass) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const enhanced = enhanceBarcodeLuminance(imgData.data, canvas.width, canvas.height, true);
            const enhancedHit = decodeGrayBufferWithZXing(enhanced, canvas.width, canvas.height);
            if (enhancedHit) return enhancedHit;
          }
        }
      } catch {
        // General decode miss
      }
      return null;
    },
    [getZxingReader, decodeGrayBufferWithZXing]
  );

  // Process a live video frame with our 6-Stage High-Precision ISP Pipeline
  const decodeVideoFrame = useCallback(async (): Promise<{ isQr: boolean; text?: string; format?: string } | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // STAGE 1: Native BarcodeDetector on raw Full-HD video element (hardware-accelerated)
    if (nativeDetectorRef.current) {
      try {
        const detected = await nativeDetectorRef.current.detect(video);
        if (detected && detected.length > 0) {
          const first = detected[0];
          const fmt = String(first.format || '').toLowerCase();
          const isQr = fmt === 'qr_code' || fmt.includes('qr');
          if (isQr || cleanBarcodeDigits(first.rawValue).length >= 8) {
            return { isQr, text: first.rawValue, format: fmt };
          }
        }
      } catch {
        // Continue to canvas stages
      }
    }

    // STAGE 2: Tight 1:1 Native Resolution Laser-Band Strip (eliminates box text/logos & glare above/below bars)
    if (!laserStripCanvasRef.current) laserStripCanvasRef.current = document.createElement('canvas');
    const stripCanvas = laserStripCanvasRef.current;
    const stripX = Math.floor(vw * 0.08);
    const stripY = Math.floor(vh * 0.34);
    const stripW = Math.floor(vw * 0.84);
    const stripH = Math.floor(vh * 0.32);
    // Preserve native 1:1 sensor pixels (up to 1440px wide) so thin 1-module bars never blur
    const nativeW = Math.min(stripW, 1440);
    const nativeH = Math.max(1, Math.floor((stripH * nativeW) / stripW));
    if (stripCanvas.width !== nativeW) stripCanvas.width = nativeW;
    if (stripCanvas.height !== nativeH) stripCanvas.height = nativeH;

    const stripCtx = stripCanvas.getContext('2d', { willReadFrequently: true });
    if (stripCtx) {
      stripCtx.imageSmoothingEnabled = false;
      stripCtx.filter = 'none';
      stripCtx.drawImage(video, stripX, stripY, stripW, stripH, 0, 0, nativeW, nativeH);

      if (nativeDetectorRef.current) {
        try {
          const detectedStrip = await nativeDetectorRef.current.detect(stripCanvas);
          if (detectedStrip && detectedStrip.length > 0) {
            const first = detectedStrip[0];
            const fmt = String(first.format || '').toLowerCase();
            const isQr = fmt === 'qr_code' || fmt.includes('qr');
            if (isQr || cleanBarcodeDigits(first.rawValue).length >= 8) {
              return { isQr, text: first.rawValue, format: fmt };
            }
          }
        } catch {
          // Continue
        }
      }

      // Stage 2 + Stage 3: Raw ZXing + Adaptive 5th-95th Percentile Contrast Stretch & 1D Horizontal Unsharp Mask
      const stripHit = decodeCanvasWithZXing(stripCanvas, true);
      if (stripHit && (stripHit.isQr || cleanBarcodeDigits(stripHit.text || '').length >= 8)) {
        return stripHit;
      }

      // STAGE 4: 1.6x Upscaled Center Strip for small 30mL/50mL perfume barcodes held further from webcam
      if (!upscaleCanvasRef.current) upscaleCanvasRef.current = document.createElement('canvas');
      const upCanvas = upscaleCanvasRef.current;
      const upW = Math.min(1600, Math.floor(nativeW * 1.55));
      const upH = Math.max(1, Math.floor(nativeH * 1.55));
      if (upCanvas.width !== upW) upCanvas.width = upW;
      if (upCanvas.height !== upH) upCanvas.height = upH;
      const upCtx = upCanvas.getContext('2d', { willReadFrequently: true });
      if (upCtx) {
        upCtx.imageSmoothingEnabled = false;
        upCtx.drawImage(stripCanvas, 0, 0, upW, upH);
        const upHit = decodeCanvasWithZXing(upCanvas, true);
        if (upHit && (upHit.isQr || cleanBarcodeDigits(upHit.text || '').length >= 8)) {
          return upHit;
        }
      }
    }

    // STAGE 5: Full Viewfinder Box Crop (in case barcode is positioned near top or bottom of frame)
    if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement('canvas');
    const cropCanvas = cropCanvasRef.current;
    const sx = Math.floor(vw * 0.08);
    const sy = Math.floor(vh * 0.2);
    const sw = Math.floor(vw * 0.84);
    const sh = Math.floor(vh * 0.6);
    const cropTargetW = Math.min(sw, 1100);
    const cropTargetH = Math.max(1, Math.floor((sh * cropTargetW) / sw));
    if (cropCanvas.width !== cropTargetW) cropCanvas.width = cropTargetW;
    if (cropCanvas.height !== cropTargetH) cropCanvas.height = cropTargetH;

    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    if (cropCtx) {
      cropCtx.imageSmoothingEnabled = false;
      cropCtx.filter = 'none';
      cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cropTargetW, cropTargetH);
      const cropHit = decodeCanvasWithZXing(cropCanvas, true);
      if (cropHit && (cropHit.isQr || cleanBarcodeDigits(cropHit.text || '').length >= 8)) {
        return cropHit;
      }
    }

    // STAGE 6: Full-frame + 90-Degree Rotated Pass (when bottle is held vertically)
    if (!fullCanvasRef.current) fullCanvasRef.current = document.createElement('canvas');
    const fullCanvas = fullCanvasRef.current;
    const targetW = Math.min(vw, 1024);
    const targetH = Math.max(1, Math.floor((vh * targetW) / vw));
    if (fullCanvas.width !== targetW) fullCanvas.width = targetW;
    if (fullCanvas.height !== targetH) fullCanvas.height = targetH;
    const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
    if (!fullCtx) return null;

    fullCtx.imageSmoothingEnabled = false;
    fullCtx.drawImage(video, 0, 0, targetW, targetH);
    let hit = decodeCanvasWithZXing(fullCanvas, false);
    if (hit && (hit.isQr || cleanBarcodeDigits(hit.text || '').length >= 8)) return hit;

    if (!rotCanvasRef.current) rotCanvasRef.current = document.createElement('canvas');
    const rotated = rotCanvasRef.current;
    if (rotated.width !== targetH) rotated.width = targetH;
    if (rotated.height !== targetW) rotated.height = targetW;
    const rotCtx = rotated.getContext('2d', { willReadFrequently: true });
    if (rotCtx) {
      rotCtx.imageSmoothingEnabled = false;
      rotCtx.save();
      rotCtx.translate(targetH / 2, targetW / 2);
      rotCtx.rotate(Math.PI / 2);
      rotCtx.drawImage(fullCanvas, -targetW / 2, -targetH / 2);
      rotCtx.restore();
      hit = decodeCanvasWithZXing(rotated, true);
      if (hit && (hit.isQr || cleanBarcodeDigits(hit.text || '').length >= 8)) return hit;
    }

    return null;
  }, [decodeCanvasWithZXing]);

  // Trigger camera autofocus & exposure recalibration on demand
  const handleTriggerRefocus = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || typeof videoTrack.getCapabilities !== 'function') return;

    setIsRefocusing(true);
    try {
      const caps: any = videoTrack.getCapabilities();
      const adv: Record<string, any> = {};
      if (caps?.focusMode && Array.isArray(caps.focusMode)) {
        if (caps.focusMode.includes('single-shot')) {
          await videoTrack.applyConstraints({ advanced: [{ focusMode: 'single-shot' } as any] });
        }
        if (caps.focusMode.includes('continuous')) {
          adv.focusMode = 'continuous';
        }
      }
      if (caps?.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
        adv.exposureMode = 'continuous';
      }
      if (Object.keys(adv).length > 0) {
        await videoTrack.applyConstraints({ advanced: [adv as any] });
      }
    } catch {
      // Ignore if hardware doesn't support manual focus reset
    } finally {
      window.setTimeout(() => setIsRefocusing(false), 450);
    }
  }, []);

  // Toggle hardware camera torch/flashlight if available
  const handleToggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    const nextState = !torchOn;
    try {
      await videoTrack.applyConstraints({ advanced: [{ torch: nextState } as any] });
      setTorchOn(nextState);
    } catch {
      // Ignore if unsupported
    }
  }, [torchOn]);

  // Start Camera Stream with Full-HD 1080p unzoomed resolution & continuous autofocus constraints
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setTorchOn(false);
    setSupportsTorch(false);
    frameSamplesRef.current = [];
    setConsensusState(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        window.location.hostname !== 'localhost' && window.location.protocol === 'http:'
          ? 'Camera requires a secure connection. Open http://localhost:3000 instead of the IP address.'
          : 'Camera stream not supported in this browser. Use photo upload or manual entry below.'
      );
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      try {
        // Request Full-HD 1920x1080 first so thin 1D barcode modules have maximum horizontal pixel density
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      // Ensure 1x normal (unzoomed) view, continuous autofocus, and continuous exposure
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings?.();
        if (settings?.width && settings?.height) {
          setCameraResolution(`${settings.width}×${settings.height}`);
        }
        if (typeof videoTrack.getCapabilities === 'function') {
          try {
            const caps: any = videoTrack.getCapabilities();
            if (caps?.torch) {
              setSupportsTorch(true);
            }
            const advancedConstraints: Record<string, any> = {};
            if (caps?.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }
            if (caps?.exposureMode && Array.isArray(caps.exposureMode) && caps.exposureMode.includes('continuous')) {
              advancedConstraints.exposureMode = 'continuous';
            }
            if (caps?.whiteBalanceMode && Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes('continuous')) {
              advancedConstraints.whiteBalanceMode = 'continuous';
            }
            if (caps?.zoom && typeof caps.zoom === 'object') {
              const minZoom = typeof caps.zoom.min === 'number' ? caps.zoom.min : 1;
              const maxZoom = typeof caps.zoom.max === 'number' ? caps.zoom.max : 1;
              advancedConstraints.zoom = Math.min(Math.max(1, minZoom), maxZoom);
            }
            if (Object.keys(advancedConstraints).length > 0) {
              await videoTrack.applyConstraints({ advanced: [advancedConstraints as any] });
            }
          } catch {
            // Ignore if advanced camera constraints are not supported
          }
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const vid = videoRef.current;
        vid.srcObject = stream;
        vid.setAttribute('playsinline', 'true');
        vid.setAttribute('autoplay', 'true');
        vid.muted = true;

        vid.onloadedmetadata = () => {
          if (vid.videoWidth && vid.videoHeight) {
            setCameraResolution(`${vid.videoWidth}×${vid.videoHeight}`);
          }
        };

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

  // Run camera lifecycle and high-frequency multi-frame consensus scan loop (~13 FPS / 75ms interval)
  useEffect(() => {
    if (initialBarcodeForScan) {
      processBarcode(initialBarcodeForScan, true);
      setInitialBarcodeForScan(null);
    }

    startCamera();

    let lastTick = 0;
    let isMounted = true;
    let isFrameBusy = false;

    const scanLoop = async (time: number) => {
      if (!isMounted) return;

      if (time - lastTick > 75 && !isFrameBusy) {
        lastTick = time;
        if (
          !isProcessingRef.current &&
          modalType === null &&
          Date.now() >= ignoreUntilRef.current
        ) {
          isFrameBusy = true;
          try {
            const hit = await decodeVideoFrame();
            const now = Date.now();
            // Prune expired samples older than 950ms
            frameSamplesRef.current = frameSamplesRef.current.filter((s) => now - s.timestamp <= 950);

            if (hit && isMounted) {
              if (hit.isQr) {
                setQrDetected(true);
                setConsensusState(null);
              } else if (hit.text) {
                setQrDetected(false);
                frameSamplesRef.current.push({
                  code: hit.text,
                  format: hit.format,
                  timestamp: now,
                });

                const consensus = evaluateBarcodeConsensus(frameSamplesRef.current, items, now, 950);
                setConsensusState(consensus.matchCount > 0 ? consensus : null);

                if (consensus.locked && consensus.code) {
                  processBarcode(consensus.code, false);
                }
              }
            } else if (frameSamplesRef.current.length === 0) {
              setConsensusState(null);
            }
          } finally {
            isFrameBusy = false;
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanLoop);
    };

    scanLoopRef.current = requestAnimationFrame(scanLoop);

    return () => {
      isMounted = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      if (processTimerRef.current) window.clearTimeout(processTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, processBarcode, modalType, decodeVideoFrame, initialBarcodeForScan, setInitialBarcodeForScan, items]);

  // Photo / Image File Upload Scanner with multi-scale & adaptive luminance enhancement
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const bmp = await createImageBitmap(file);

      // 1. Try native detector first on full image bitmap
      if (nativeDetectorRef.current) {
        try {
          const detected = await nativeDetectorRef.current.detect(bmp);
          if (detected && detected.length > 0) {
            const first = detected[0];
            if (first.format === 'qr_code' || String(first.format).toLowerCase().includes('qr')) {
              setQrDetected(true);
              return;
            }
            processBarcode(first.rawValue, true);
            return;
          }
        } catch {
          // Fallback to multi-pass ZXing
        }
      }

      // 2. Multi-scale + Adaptive Contrast + Center Crop + Rotated ZXing passes
      const scales = [1, 1.5, 0.75];
      for (const sc of scales) {
        const canvas = document.createElement('canvas');
        const maxDim = Math.round(1400 * sc);
        const ratio = bmp.width > maxDim ? maxDim / bmp.width : sc;
        canvas.width = Math.max(1, Math.floor(bmp.width * ratio));
        canvas.height = Math.max(1, Math.floor(bmp.height * ratio));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

        // Pass A: Full image + Adaptive 5th-95th percentile unsharp pass
        let hit = decodeCanvasWithZXing(canvas, true);

        // Pass B: Center horizontal band crop (isolates barcode from packaging text)
        if (!hit) {
          const bandCanvas = document.createElement('canvas');
          bandCanvas.width = canvas.width;
          bandCanvas.height = Math.max(1, Math.floor(canvas.height * 0.45));
          const bCtx = bandCanvas.getContext('2d', { willReadFrequently: true });
          if (bCtx) {
            bCtx.imageSmoothingEnabled = false;
            bCtx.drawImage(
              canvas,
              0,
              Math.floor(canvas.height * 0.27),
              canvas.width,
              bandCanvas.height,
              0,
              0,
              bandCanvas.width,
              bandCanvas.height
            );
            hit = decodeCanvasWithZXing(bandCanvas, true);
          }
        }

        // Pass C: Rotated 90 deg pass
        if (!hit) {
          const rotCanvas = document.createElement('canvas');
          rotCanvas.width = canvas.height;
          rotCanvas.height = canvas.width;
          const rCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
          if (rCtx) {
            rCtx.imageSmoothingEnabled = false;
            rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            rCtx.rotate(Math.PI / 2);
            rCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            hit = decodeCanvasWithZXing(rotCanvas, true);
          }
        }

        if (hit) {
          if (hit.isQr) {
            setQrDetected(true);
            return;
          }
          if (hit.text) {
            processBarcode(hit.text, true);
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

  // Submit Handler: Add stock to existing item in inventory with audit reason
  const handleAddStockConfirm = async () => {
    if (!matchedItem) return;
    const qty = Math.max(1, quantityToAdd);
    await addStock(matchedItem.id, qty, stockReason);
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
    <div className="space-y-3.5 sm:space-y-5 max-w-2xl mx-auto pb-8">
      {/* View Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#242119]">
            Scan Barcode
          </h2>
          <p className="text-xs text-[#7c7156]">
            Multi-frame verified EAN-13, UPC-A &amp; Code-128 precision scanner
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ec] border border-[#c9d8c5] text-[#57795c] text-[11px] font-semibold shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GS1 &amp; Multi-Pass Lock</span>
        </div>
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
      <div className="bg-white border border-[#e7e2d4] rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
        {/* Live Camera Viewfinder */}
        <div
          onClick={handleTriggerRefocus}
          className="relative aspect-4/3 w-full max-h-[360px] sm:max-h-[420px] bg-[#1b1915] rounded-xl overflow-hidden border border-[#e7e2d4] flex flex-col items-center justify-center cursor-pointer"
          title="Tap viewfinder to refocus camera"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-contain"
          />

          {/* Active Viewfinder Target Box */}
          {!cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div
                className={`w-4/5 sm:w-3/4 h-2/5 border-2 rounded-xl relative flex items-center justify-center shadow-inner transition-colors duration-150 ${
                  consensusState && consensusState.matchCount > 0
                    ? 'border-[#57795c] bg-[#57795c]/10'
                    : isRefocusing
                    ? 'border-[#d4af37]'
                    : 'border-dashed border-[#efeadc]/90'
                }`}
              >
                {/* Laser guideline */}
                <div
                  className={`w-full h-0.5 absolute transition-colors ${
                    consensusState && consensusState.matchCount > 0
                      ? 'bg-[#57795c] shadow-[0_0_10px_#57795c]'
                      : 'bg-[#9c8f6f] shadow-[0_0_8px_#9c8f6f] animate-pulse'
                  }`}
                />
              </div>
              <span className="mt-3 px-3 py-1 rounded-full bg-black/75 text-[11px] font-mono text-white tracking-wide">
                {consensusState && consensusState.matchCount > 0
                  ? `Verifying ${consensusState.code} (${consensusState.matchCount}/${consensusState.requiredCount} frames)...`
                  : isRefocusing
                  ? 'Refocusing optics...'
                  : 'Align barcode along center laser line (Tap to refocus)'}
              </span>
            </div>
          )}

          {/* Camera Controls Overlay */}
          {!cameraError && (
            <div
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {supportsTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title={torchOn ? 'Turn Off Torch' : 'Turn On Torch'}
                  className={`p-2 rounded-lg transition-colors ${
                    torchOn ? 'bg-[#d4af37] text-[#1b1915]' : 'bg-black/60 text-white hover:bg-black/80'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleTriggerRefocus}
                title="Refocus Camera"
                className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <Focus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={startCamera}
                title="Restart Camera"
                className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Barcode Verified Lock Overlay */}
          {isProcessingScan && (
            <div className="absolute inset-0 bg-[#1b1915]/85 backdrop-blur-xs flex flex-col items-center justify-center text-center z-30 animate-fadeIn p-4">
              <div className="w-11 h-11 rounded-2xl bg-[#57795c]/30 border border-[#57795c] flex items-center justify-center mb-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#eef2ec]" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Barcode Verified &amp; Locked
              </div>
              <div className="text-sm font-mono font-bold text-[#efeadc] mt-1 tracking-widest">
                {processingBarcodeText}
              </div>
            </div>
          )}

          {/* Camera error fallback overlay */}
          {cameraError && !isProcessingScan && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 bg-[#faf8f4] p-4 flex flex-col items-center justify-center text-center z-20 cursor-default"
            >
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
            <span
              className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                isProcessingScan
                  ? 'bg-[#57795c] animate-ping'
                  : isCameraActive
                  ? 'bg-[#57795c]'
                  : 'bg-[#7c7156]'
              }`}
            />
            <span className="truncate">
              {isProcessingScan
                ? `Verified barcode ${processingBarcodeText}...`
                : isCameraActive
                ? `6-Pass HD Scanner Active${cameraResolution ? ` (${cameraResolution})` : ''}`
                : cameraError
                ? 'Ready for photo upload or manual barcode'
                : 'Camera stream initializing...'}
            </span>
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
                  if (manualCode.trim()) processBarcode(manualCode.trim(), true);
                }
              }}
              placeholder="e.g. 3145891265478"
              className="flex-1 px-3 py-2 bg-white border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#242119] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
            <button
              type="button"
              disabled={isProcessingScan}
              onClick={() => {
                if (!manualCode.trim()) {
                  setManualError('Enter a barcode number');
                  return;
                }
                processBarcode(manualCode.trim(), true);
              }}
              className="px-4 py-2 bg-[#9c8f6f] hover:bg-[#7c7156] disabled:opacity-60 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isProcessingScan ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> ADD
                </>
              )}
            </button>
          </div>
          {manualError && <p className="text-xs text-[#a05539] font-medium">{manualError}</p>}
        </div>
      </div>

      {/* =========================================================================
          POP-UP MODAL 1: "Add to Existing Inventory"
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
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-[#7c7156] shrink-0" />
                <h3 className="font-serif text-base font-bold text-[#242119] truncate">
                  {matchedItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors shrink-0"
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

              {/* Reason for Stock Addition */}
              <div className="space-y-1.5 pt-2 border-t border-[#f0ece0]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#56534a]">
                  Reason for Stock Adjustment
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SCAN_ADD_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setStockReason(reason)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                        stockReason === reason
                          ? 'bg-[#242119] text-white border-[#242119]'
                          : 'bg-[#faf8f4] text-[#56534a] border-[#e7e2d4] hover:bg-[#f2efe6]'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
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
