"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  X,
  ChevronLeft,
  Loader2,
  MapPin,
  Tag,
  Calendar,
  DollarSign,
  ShoppingBag,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import { compressImage, extractGpsFromImage, fileToBase64 } from "@/lib/image-utils";
import { parseReceiptWithAI } from "@/app/actions/parse-receipt";
import { hapticSuccess } from "@/lib/haptics";
import { SCAN_MODE_CONFIG, type ScanMode, type ParsedReceipt } from "@/lib/receipt/types";
import { RECEIPT_RETENTION_DAYS } from "@/lib/subscription/receipt-retention";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiptScannerSheetProps {
  isOpen:           boolean;
  onClose:          () => void;
  /** Called when user taps "Fill form →". keepProof=true when the proof toggle was on. */
  onExtracted:      (result: ParsedReceipt, keepProof: boolean) => void;
  mode:             ScanMode;
  groupType?:       string;
  isPlusUser:       boolean;
  pendingProofRef?: React.MutableRefObject<File | null>;
}

type ScannerState =
  | { type: "idle" }
  | { type: "viewfinder"; stream: MediaStream; loading: boolean }
  | { type: "processing"; file: File; previewUrl: string; gps: { lat: number; lng: number } | null }
  | { type: "results";    file: File; previewUrl: string; result: ParsedReceipt; keepProof: boolean };

// ── Component ─────────────────────────────────────────────────────────────────

export function ReceiptScannerSheet({
  isOpen,
  onClose,
  onExtracted,
  mode,
  groupType,
  isPlusUser,
  pendingProofRef,
}: ReceiptScannerSheetProps) {
  const [state, setState] = useState<ScannerState>({ type: "idle" });
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── URL cleanup wrapper ──────────────────────────────────────────────────────
  const transitionState = useCallback((next: ScannerState) => {
    setState(prev => {
      // Revoke previous previewUrl only if the next state doesn't reuse the same URL.
      // processing → results reuses the same previewUrl, so we must NOT revoke here.
      if ((prev.type === "processing" || prev.type === "results") && prev.previewUrl) {
        const nextUrl = (next as { previewUrl?: string }).previewUrl;
        if (nextUrl !== prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
      }
      return next;
    });
  }, []);

  // ── Camera cleanup ───────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    setState(prev => {
      if (prev.type === "viewfinder" && prev.stream) {
        prev.stream.getTracks().forEach(t => t.stop());
      }
      return prev;
    });
  }, []);

  // Camera cleanup on unmount (trigger 3)
  useEffect(() => {
    return () => {
      setState(prev => {
        if (prev.type === "viewfinder" && prev.stream) {
          prev.stream.getTracks().forEach(t => t.stop());
        }
        if ((prev.type === "processing" || prev.type === "results") && prev.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return prev;
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to idle when sheet closes
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setState({ type: "idle" });
    }
  }, [isOpen, stopStream]);

  // Escape key dismissal only — do NOT use useSheetDismiss here.
  // useSheetDismiss pushes a fake history entry and cleans it up with history.go(-1).
  // On a form page (Add Expense), Next.js 16 intercepts that popstate for the same URL
  // and triggers a full RSC refresh, wiping all AI-filled form state and confusing
  // the browser history so the back button stops working correctly.
  // The scanner is dismissed via X button, backdrop tap, or Escape — no history needed.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Close handler ────────────────────────────────────────────────────────────
  function handleClose() {
    setState(prev => {
      if (prev.type === "viewfinder" && prev.stream) {
        prev.stream.getTracks().forEach(t => t.stop());
      }
      if ((prev.type === "processing" || prev.type === "results") && prev.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return { type: "idle" };
    });
    onClose();
  }

  // ── Camera init ──────────────────────────────────────────────────────────────
  async function openCamera() {
    if (!navigator.onLine) {
      toast.error("No internet connection — upload a saved photo instead");
      return;
    }
    transitionState({ type: "viewfinder", stream: new MediaStream(), loading: true });

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        // Fallback: try any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      setState(prev => {
        if (prev.type !== "viewfinder") {
          // Sheet closed while camera was initializing — stop stream immediately
          stream.getTracks().forEach(t => t.stop());
          return prev;
        }
        return { type: "viewfinder", stream, loading: false };
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      transitionState({ type: "idle" });
      toast.error("Camera unavailable — upload a photo instead");
    }
  }

  // Attach stream to video element once available
  useEffect(() => {
    if (state.type === "viewfinder" && !state.loading && videoRef.current && state.stream.active) {
      videoRef.current.srcObject = state.stream;
    }
  }, [state]);

  // ── Camera capture ───────────────────────────────────────────────────────────
  async function handleCapture() {
    if (state.type !== "viewfinder" || !videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    // Stop stream immediately after capture (trigger 1)
    state.stream.getTracks().forEach(t => t.stop());

    canvas.toBlob(async (blob) => {
      if (!blob) { toast.error("Capture failed — try again"); transitionState({ type: "idle" }); return; }
      const file = new File([blob], "receipt.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      // No GPS from camera — canvas strips EXIF
      transitionState({ type: "processing", file: compressed, previewUrl, gps: null });
      await startProcessing(compressed, null, previewUrl);
    }, "image/jpeg", 0.92);
  }

  // ── File input ───────────────────────────────────────────────────────────────
  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be selected again
    e.target.value = "";

    if (!navigator.onLine) {
      toast.error("No internet connection");
      return;
    }

    // Show processing state immediately with the original file so the scan line
    // animation appears without waiting for compression — instant perceived response.
    const previewUrl = URL.createObjectURL(file);
    transitionState({ type: "processing", file, previewUrl, gps: null });

    // Compress + extract GPS in parallel (EXIF must run on original — canvas strips GPS).
    const [compressed, gps] = await Promise.all([
      compressImage(file),
      extractGpsFromImage(file),
    ]);

    // Swap to compressed file for AI upload; keep same previewUrl (original quality is fine for display).
    setState(prev => {
      if (prev.type !== "processing") return prev; // user may have cancelled
      return { ...prev, file: compressed, gps };
    });

    await startProcessing(compressed, gps, previewUrl);
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  async function startProcessing(
    file: File,
    gps: { lat: number; lng: number } | null,
    previewUrl: string,
  ) {
    try {
      const base64 = await fileToBase64(file);
      const result = await parseReceiptWithAI({
        base64Image:   base64,
        mimeType:      "image/jpeg",
        gpsCoords:     gps ?? undefined,
        groupType:     groupType ?? "trip",
        dateContext:   { today: format(new Date(), "yyyy-MM-dd") },
      });

      if (!result) {
        toast.error("Scan failed — please try again");
        transitionState({ type: "idle" });
        return;
      }
      if ("ok" in result && !result.ok) {
        toast.error(result.error);
        transitionState({ type: "idle" });
        return;
      }

      hapticSuccess();
      transitionState({
        type:      "results",
        file,
        previewUrl,
        result:    result as ParsedReceipt,
        keepProof: false,
      });
    } catch {
      toast.error("Scan failed — please try again");
      transitionState({ type: "idle" });
    }
  }

  // ── Fill form ────────────────────────────────────────────────────────────────
  function fillForm() {
    if (state.type !== "results") return;
    // Pass keepProof so the parent form can show a "proof pending" indicator
    onExtracted(state.result, state.keepProof);
    if (state.keepProof && pendingProofRef) {
      pendingProofRef.current = state.file;
    }
    handleClose();
  }

  // ── Sheet animation — iOS video fix ─────────────────────────────────────────
  // transform:translateY breaks iOS Safari video rendering.
  // When entering viewfinder: instant position (no entrance animation).
  const isViewfinder   = state.type === "viewfinder";
  const sheetInitial   = isViewfinder ? { y: 0 }      : { y: "100%" };
  const sheetAnimate   = isViewfinder ? { y: 0 }      : { y: 0 };
  const sheetExit      = isViewfinder ? { y: "100%" } : { y: "100%" };
  const sheetTransition = isViewfinder
    ? { duration: 0 }
    : { type: "spring" as const, damping: 30, stiffness: 300 };
  const sheetHeight = isViewfinder
    ? "h-[90dvh]"
    : state.type === "processing"
      ? "h-[72vh]"          // explicit height so flex-1 (all-absolute children) expands
      : state.type === "results"
        ? "max-h-[90vh]"
        : "max-h-[85vh]";

  const config = SCAN_MODE_CONFIG[mode];

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="scanner-backdrop"
            className="fixed inset-0 z-[70] bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="scanner-sheet"
            className={`fixed bottom-0 left-0 right-0 z-[71] bg-slate-950 rounded-t-2xl overflow-hidden flex flex-col ${sheetHeight}`}
            initial={sheetInitial}
            animate={sheetAnimate}
            exit={sheetExit}
            transition={sheetTransition}
          >
            {state.type === "idle"   && <IdleState   isPlusUser={isPlusUser} onCamera={openCamera} onUpload={() => fileInputRef.current?.click()} />}
            {state.type === "viewfinder" && (
              <ViewfinderState
                loading={state.loading}
                videoRef={videoRef}
                canvasRef={canvasRef}
                onCapture={handleCapture}
                onBack={handleClose}
                onUpload={() => fileInputRef.current?.click()}
              />
            )}
            {state.type === "processing" && (
              <ProcessingState previewUrl={state.previewUrl} onBack={handleClose} />
            )}
            {state.type === "results" && (
              <ResultsState
                result={state.result}
                previewUrl={state.previewUrl}
                keepProof={state.keepProof}
                isPlusUser={isPlusUser}
                config={config}
                onKeepProofChange={(v) =>
                  setState(prev => prev.type === "results" ? { ...prev, keepProof: v } : prev)
                }
                onFillForm={fillForm}
                onRetry={() => transitionState({ type: "idle" })}
                onBack={handleClose}
              />
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={handleFileInput}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Sub-states ────────────────────────────────────────────────────────────────

function IdleState({
  isPlusUser,
  onCamera,
  onUpload,
}: {
  isPlusUser: boolean;
  onCamera:  () => void;
  onUpload:  () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Scan receipt</span>
          {!isPlusUser && (
            <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Plus
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-5">
        {!isPlusUser ? (
          /* ── Plus gate ───────────────────────────────────────────── */
          <div className="w-full max-w-sm">
            <div className="rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-900/60 border border-violet-700/40 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-semibold text-base">AI Receipt Scanning</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Snap a photo of any receipt — Clear reads the amount, merchant, date, and items automatically.
              </p>
              <a
                href="/upgrade"
                className="block mt-4 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-violet-500/30"
              >
                Upgrade to Plus →
              </a>
            </div>
          </div>
        ) : (
          /* ── Plus user: two options ──────────────────────────────── */
          <>
            <p className="text-slate-400 text-sm text-center">
              Analyzed by AI. Stored only if you enable <span className="text-slate-300">&ldquo;Keep as proof&rdquo;</span>.
            </p>
            <div className="w-full max-w-sm grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCamera}
                className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-cyan-600/50 hover:bg-slate-800 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white">Take photo</span>
              </button>

              <button
                type="button"
                onClick={onUpload}
                className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:border-cyan-600/50 hover:bg-slate-800 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white">Upload</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ViewfinderState({
  loading,
  videoRef,
  canvasRef,
  onCapture,
  onBack,
  onUpload,
}: {
  loading:   boolean;
  videoRef:  React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCapture: () => void;
  onBack:    () => void;
  onUpload:  () => void;
}) {
  return (
    <div className="relative flex-1 bg-black">
      {/* Live video */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-slate-300 text-sm">Starting camera…</p>
        </div>
      )}

      {/* Alignment guide — white rectangle with corner brackets */}
      {!loading && (
        <div className="absolute inset-x-8 top-[15%] bottom-[25%] flex items-center justify-center">
          <div className="w-full h-full relative">
            {/* Corners */}
            {(["tl","tr","bl","br"] as const).map(corner => (
              <div
                key={corner}
                className={`absolute w-6 h-6 border-white border-2
                  ${corner === "tl" ? "top-0 left-0 border-r-0 border-b-0 rounded-tl-sm" : ""}
                  ${corner === "tr" ? "top-0 right-0 border-l-0 border-b-0 rounded-tr-sm" : ""}
                  ${corner === "bl" ? "bottom-0 left-0 border-r-0 border-t-0 rounded-bl-sm" : ""}
                  ${corner === "br" ? "bottom-0 right-0 border-l-0 border-t-0 rounded-br-sm" : ""}
                `}
              />
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      {/* Upload from gallery */}
      <button
        type="button"
        onClick={onUpload}
        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
      >
        <Upload className="w-4.5 h-4.5 text-white" />
      </button>

      {/* Shutter button */}
      {!loading && (
        <button
          type="button"
          onClick={onCapture}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Capture photo"
        >
          <div className="w-12 h-12 rounded-full bg-white" />
        </button>
      )}

      {/* Hint */}
      {!loading && (
        <p className="absolute bottom-28 left-0 right-0 text-center text-white/70 text-xs">
          Position receipt inside the frame
        </p>
      )}
    </div>
  );
}

function ProcessingState({
  previewUrl,
  onBack,
}: {
  previewUrl: string;
  onBack:     () => void;
}) {
  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      {/* Receipt preview at reduced opacity */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt="Receipt being scanned"
        className="absolute inset-0 w-full h-full object-contain opacity-70"
      />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]"
        initial={{ top: "8%" }}
        animate={{ top: "92%" }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Overlay text */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-white text-sm font-medium">Reading your receipt…</span>
        </div>
      </div>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

function ResultsState({
  result,
  previewUrl,
  keepProof,
  isPlusUser,
  config,
  onKeepProofChange,
  onFillForm,
  onRetry,
  onBack,
}: {
  result:            ParsedReceipt;
  previewUrl:        string;
  keepProof:         boolean;
  isPlusUser:        boolean;
  config:            (typeof SCAN_MODE_CONFIG)[ScanMode];
  onKeepProofChange: (v: boolean) => void;
  onFillForm:        () => void;
  onRetry:           () => void;
  onBack:            () => void;
}) {
  const confidenceMeta = {
    high:   { label: "High confidence",   color: "text-emerald-400", dot: "bg-emerald-400" },
    medium: { label: "Medium confidence", color: "text-amber-400",   dot: "bg-amber-400"   },
    low:    { label: "Low confidence",    color: "text-red-400",     dot: "bg-red-400"      },
  }[result.confidence];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4 text-slate-300" />
        </button>
        <span className="text-sm font-semibold text-white">Scan results</span>
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Preview thumbnail + confidence */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Scanned receipt"
            className="w-14 h-14 rounded-xl object-cover border border-slate-700"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${confidenceMeta.dot}`} />
              <span className={`text-xs font-medium ${confidenceMeta.color}`}>
                {confidenceMeta.label}
              </span>
            </div>
            {result.confidence === "low" && (
              <p className="text-xs text-slate-400 mt-0.5">Some fields may need editing</p>
            )}
          </div>
        </div>

        {/* Result chips — 2-col grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Amount — always shown */}
          <ResultChip
            icon={<DollarSign className="w-3.5 h-3.5" />}
            label="Amount"
            value={
              result.amount !== null
                ? `${result.currency ?? ""} ${result.amount}`.trim()
                : "—"
            }
            filled={result.amount !== null}
          />

          {/* Merchant — always shown */}
          <ResultChip
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            label="Merchant"
            value={result.description || "—"}
            filled={!!result.description}
          />

          {/* Date — always shown */}
          <ResultChip
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Date"
            value={result.expenseDate ?? "—"}
            filled={!!result.expenseDate}
          />

          {/* Category */}
          {config.showCategoryResult && (
            <ResultChip
              icon={<Tag className="w-3.5 h-3.5" />}
              label="Category"
              value={result.category || "other"}
              filled={!!result.category && result.category !== "other"}
            />
          )}

          {/* Location */}
          {config.showLocationResult && result.location && (
            <ResultChip
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Location"
              value={result.location.name}
              filled
              colSpan
            />
          )}

          {/* Items count */}
          {config.showItemsResult && result.receiptItems.length > 0 && (
            <ResultChip
              icon={<ShoppingBag className="w-3.5 h-3.5" />}
              label="Items"
              value={`${result.receiptItems.length} item${result.receiptItems.length !== 1 ? "s" : ""} detected`}
              filled
              colSpan
            />
          )}
        </div>

        {/* Low confidence warning */}
        {result.confidence === "low" && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-900/20 border border-amber-800/40">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              The photo may be blurry or at an angle. You can still fill the form and adjust manually.
            </p>
          </div>
        )}

        {/* Keep as proof toggle */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={keepProof}
              onChange={e => onKeepProofChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full bg-slate-700 peer-checked:bg-cyan-500 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{config.proofToggleLabel}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{config.proofDisclosure}</p>
            {!isPlusUser && keepProof && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kept {RECEIPT_RETENTION_DAYS} days on Free · permanent on Plus
              </p>
            )}
          </div>
        </label>
      </div>

      {/* CTAs */}
      <div className="shrink-0 px-4 pb-6 pt-3 space-y-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onFillForm}
          className="w-full py-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-sm font-semibold shadow-md shadow-cyan-500/20 active:scale-[0.98] transition-transform"
        >
          {config.ctaLabel}
        </button>

        {result.confidence === "low" ? (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-2 text-sm text-slate-400 text-center"
          >
            Try a clearer photo
          </button>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-2 text-sm text-cyan-400 text-center"
          >
            Scan again
          </button>
        )}
      </div>
    </div>
  );
}

function ResultChip({
  icon,
  label,
  value,
  filled,
  colSpan,
}: {
  icon:     React.ReactNode;
  label:    string;
  value:    string;
  filled:   boolean;
  colSpan?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2.5 rounded-xl border transition-colors
        ${filled
          ? "bg-slate-800/80 border-slate-700/60"
          : "bg-slate-900/60 border-slate-800/40"
        }
        ${colSpan ? "col-span-2" : ""}
      `}
    >
      <div className={`flex items-center gap-1 ${filled ? "text-cyan-400" : "text-slate-600"}`}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-sm font-medium truncate ${
          filled ? "text-white" : "text-slate-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
