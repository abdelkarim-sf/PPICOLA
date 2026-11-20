"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  defaultEdits,
  transformImage,
  cropAndFilter,
  canvasToBlob,
  loadImageElement,
  type ImageEdits,
  type Rotation,
} from "@/lib/image";
import { useT } from "@/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Cropper = dynamic<any>(() => import("react-easy-crop").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="skeleton h-40 w-40 rounded-2xl" />
    </div>
  ),
});

const ASPECTS = [
  { key: "free", labelKey: "shared.free", value: undefined as number | undefined },
  { key: "a4", labelKey: "shared.a4", value: 210 / 297 },
  { key: "1:1", labelKey: "shared.sq", value: 1 },
  { key: "4:3", labelKey: "shared.r43", value: 4 / 3 },
  { key: "16:9", labelKey: "shared.r169", value: 16 / 9 },
];

type Props = {
  open: boolean;
  fileUrl: string;
  initial?: ImageEdits | null;
  onCancel: () => void;
  onApply: (edits: ImageEdits, blob: Blob, previewUrl: string) => void;
};

export default function ImageEditorModal({ open, fileUrl, initial, onCancel, onApply }: Props) {
  const { t } = useT();
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [cropPixels, setCropPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [freeAspect, setFreeAspect] = useState(4 / 3);
  const cropperWrapRef = useRef<HTMLDivElement | null>(null);

  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialRef = useRef<ImageEdits | null>(initial ?? null);
  initialRef.current = initial ?? null;

  // (Re)build the transformed base image whenever rotation/flips change or the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const init = initialRef.current;
    setRotation(init?.rotation ?? 0);
    setFlipH(init?.flipH ?? false);
    setFlipV(init?.flipV ?? false);
    setZoom(init?.zoom ?? 1);
    setBrightness(init?.brightness ?? 100);
    setContrast(init?.contrast ?? 100);
    setAspect(undefined);
    setCrop({ x: 0, y: 0 });
    setCropPixels(init?.crop ?? null);
    setBaseUrl(null);

    loadImageElement(fileUrl)
      .then((img) => {
        if (cancelled) return;
        const r = initialRef.current?.rotation ?? 0;
        const fh = initialRef.current?.flipH ?? false;
        const fv = initialRef.current?.flipV ?? false;
        const canvas = transformImage(img, img.naturalWidth, img.naturalHeight, r, fh, fv);
        baseCanvasRef.current = canvas;
        setBaseUrl(canvas.toDataURL("image/jpeg", 0.92));
      })
      .catch(() => {
        if (!cancelled) setBaseUrl(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fileUrl]);

  // Re-transform when rotation/flip changes after load.
  useEffect(() => {
    if (!open || !baseUrl) return;
    let cancelled = false;
    loadImageElement(fileUrl)
      .then((img) => {
        if (cancelled) return;
        const canvas = transformImage(img, img.naturalWidth, img.naturalHeight, rotation, flipH, flipV);
        baseCanvasRef.current = canvas;
        setBaseUrl(canvas.toDataURL("image/jpeg", 0.92));
        setCropPixels(null); // crop box resets when the base image changes
        setCrop({ x: 0, y: 0 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, flipH, flipV]);

  const rotate = (dir: 1 | -1) => {
    const order: Rotation[] = [0, 90, 180, 270];
    const next = order[(order.indexOf(rotation) + dir + 4) % 4];
    setRotation(next);
  };

  const reset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setAspect(undefined);
    setCropPixels(null);
    setCrop({ x: 0, y: 0 });
  };

  const apply = async () => {
    const base = baseCanvasRef.current;
    if (!base) return;
    setBusy(true);
    try {
      const full = { x: 0, y: 0, width: base.width, height: base.height };
      const area = cropPixels ?? full;
      const out = cropAndFilter(base, area, brightness, contrast);
      const blob = await canvasToBlob(out, "image/jpeg", 0.92);
      const edits: ImageEdits = {
        rotation,
        flipH,
        flipV,
        crop: area,
        zoom,
        brightness,
        contrast,
      };
      const previewUrl = URL.createObjectURL(blob);
      onApply(edits, blob, previewUrl);
    } finally {
      setBusy(false);
    }
  };

  // "Free" aspect = the cropper area's own ratio, measured after mount.
  useEffect(() => {
    if (!baseUrl) return;
    const t = setTimeout(() => {
      const el = cropperWrapRef.current;
      if (el && el.clientHeight > 0) setFreeAspect(el.clientWidth / el.clientHeight);
    }, 60);
    return () => clearTimeout(t);
  }, [baseUrl]);

  const filterStyle = useMemo(
    () => ({ filter: `brightness(${brightness}%) contrast(${contrast}%)` }),
    [brightness, contrast]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6"
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-label={t("shared.editImage")}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[100dvh] sm:h-auto sm:max-h-[92vh] w-full sm:max-w-3xl flex-col overflow-hidden rounded-t-4xl sm:rounded-4xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171427] shadow-lift"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 px-5 py-4">
              <h2 className="text-lg font-extrabold">{t("shared.editImage")}</h2>
              <button
                onClick={onCancel}
                aria-label={t("shared.closeEditor")}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* cropper */}
            <div
              ref={cropperWrapRef}
              className="relative h-[42vh] sm:h-[46vh] shrink-0 bg-[repeating-conic-gradient(#e9e7f5_0%_25%,#f6f5fb_0%_50%)] dark:bg-[repeating-conic-gradient(#221e3a_0%_25%,#1a1730_0%_50%)] bg-[length:20px_20px]"
            >
              {baseUrl && (
                <Cropper
                  image={baseUrl}
                  initialCroppedAreaPixels={initial?.crop ?? undefined}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect ?? freeAspect}
                  minZoom={1}
                  maxZoom={3.5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_area: unknown, pixels: { x: number; y: number; width: number; height: number }) => setCropPixels(pixels)}
                  cropperProps={{ style: filterStyle }}
                  showGrid
                />
              )}
            </div>

            {/* controls */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* aspect presets */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{t("shared.cropShape")}</p>
                <div className="flex flex-wrap gap-2">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => setAspect(a.value)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                        aspect === a.value
                          ? "bg-brand-500 text-white shadow-lift"
                          : "bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-white/15"
                      }`}
                    >
                      {t(a.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* transform buttons */}
              <div className="grid grid-cols-4 gap-2">
                <TransformButton label={t("shared.rotateLeft")} onClick={() => rotate(-1)} />
                <TransformButton label={t("shared.rotateRight")} onClick={() => rotate(1)} />
                <TransformButton label={t("shared.flipHorizontal")} active={flipH} onClick={() => setFlipH((v) => !v)} />
                <TransformButton label={t("shared.flipVertical")} active={flipV} onClick={() => setFlipV((v) => !v)} />
              </div>

              {/* sliders */}
              <Slider label={t("shared.zoom")} value={zoom} min={1} max={3.5} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={setZoom} />
              <Slider label={t("shared.brightness")} value={brightness} min={50} max={150} step={1} format={(v) => `${v}%`} onChange={setBrightness} />
              <Slider label={t("shared.contrast")} value={contrast} min={50} max={150} step={1} format={(v) => `${v}%`} onChange={setContrast} />
            </div>

            {/* footer */}
            <div className="flex items-center gap-2.5 border-t border-black/5 dark:border-white/10 px-5 py-4">
              <button onClick={reset} className="btn-ghost !px-4 !py-2.5 text-sm">
                {t("shared.reset")}
              </button>
              <div className="flex-1" />
              <button onClick={onCancel} className="btn-ghost !px-4 !py-2.5 text-sm">
                {t("shared.cancel")}
              </button>
              <button onClick={apply} disabled={busy} className="btn-primary !px-5 !py-2.5 text-sm">
                {busy ? t("shared.applying") : t("shared.applyBtn")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TransformButton({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-2 py-2.5 text-xs font-bold transition-all ${
        active
          ? "bg-mint-500 text-white shadow-lift"
          : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-gray-400">{label}</span>
        <span className="font-bold text-brand-600 dark:text-brand-300">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-100 dark:bg-white/10 accent-brand-500"
        aria-label={label}
      />
    </label>
  );
}
