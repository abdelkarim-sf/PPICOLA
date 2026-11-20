"use client";
import { useT } from "@/i18n";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolShell, { ToolCard } from "./ToolShell";
import DropZone from "./DropZone";
import SortableGrid from "./SortableGrid";
import FileCard from "./FileCard";
import DownloadPanel, { type DownloadResult } from "./DownloadPanel";
import ErrorList, { type ToolError } from "./ErrorList";
import OptionGroup from "./OptionGroup";
import { config } from "@/config";
import { formatBytes, uid, baseName } from "@/lib/files";
import { loadImageDims } from "@/lib/image";

const MAX_SIDE = 8000;

type ImageItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
  width: number;
  height: number;
};

type Direction = "vertical" | "horizontal";
type FitMode = "none" | "fit";

export default function MergeImagesClient() {
  const { t } = useT();
  const [items, setItems] = useState<ImageItem[]>([]);
  const [direction, setDirection] = useState<Direction>("vertical");
  const [fit, setFit] = useState<FitMode>("fit");
  const [spacing, setSpacing] = useState(16);
  const [padding, setPadding] = useState(24);
  const [bg, setBg] = useState("#ffffff");
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [errors, setErrors] = useState<ToolError[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgCache = useRef(new Map<string, HTMLImageElement>());

  const urlsRef = useRef<string[]>([]);
  useEffect(() => {
    const pool = urlsRef.current;
    return () => pool.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const added: ImageItem[] = [];
    const errs: ToolError[] = [];
    for (const file of files) {
      try {
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        const dims = await loadImageDims(url);
        added.push({ id: uid(), file, name: file.name, size: file.size, url, width: dims.width, height: dims.height });
      } catch {
        errs.push({ file: file.name, reason: t("shared.errImageRead") });
      }
    }
    if (added.length) setItems((prev) => [...prev, ...added]);
    if (errs.length) setErrors(errs);
  }, [t]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.url));
      return [];
    });
    setResult(null);
    setErrors([]);
  }, []);

  /** Compute the composite layout (unscaled pixel dims + rects). */
  const layout = useMemo(() => {
    if (!items.length) return null;
    const rects: { it: ImageItem; w: number; h: number }[] = items.map((it) => ({ it, w: it.width, h: it.height }));
    if (direction === "vertical" && fit === "fit") {
      const common = Math.max(...items.map((i) => i.width));
      rects.forEach((r) => {
        r.h = Math.round((r.it.height * common) / r.it.width);
        r.w = common;
      });
    }
    if (direction === "horizontal" && fit === "fit") {
      const common = Math.max(...items.map((i) => i.height));
      rects.forEach((r) => {
        r.w = Math.round((r.it.width * common) / r.it.height);
        r.h = common;
      });
    }
    const contentW = direction === "vertical" ? Math.max(...rects.map((r) => r.w)) : rects.reduce((a, r) => a + r.w, 0) + spacing * (rects.length - 1);
    const contentH = direction === "horizontal" ? Math.max(...rects.map((r) => r.h)) : rects.reduce((a, r) => a + r.h, 0) + spacing * (rects.length - 1);
    const w = contentW + padding * 2;
    const h = contentH + padding * 2;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    return { rects, w: Math.round(w * scale), h: Math.round(h * scale), scale, spacing, padding };
  }, [items, direction, fit, spacing, padding]);

  const draw = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (!layout) return;
      canvas.width = layout.w;
      canvas.height = layout.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      let offset = layout.padding * layout.scale;
      for (const r of layout.rects) {
        const w = Math.max(1, Math.round(r.w * layout.scale));
        const h = Math.max(1, Math.round(r.h * layout.scale));
        const x = direction === "vertical" ? Math.round((layout.w - w) / 2) : offset;
        const y = direction === "horizontal" ? Math.round((layout.h - h) / 2) : offset;
        // use a cached <img> so drawImage never runs before the image has decoded
        let img = imgCache.current.get(r.it.url);
        if (!img) {
          img = new Image();
          imgCache.current.set(r.it.url, img);
          img.src = r.it.url;
        }
        if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
        if (direction === "vertical") offset += h + layout.spacing * layout.scale;
        else offset += w + layout.spacing * layout.scale;
      }
    },
    [layout, bg, direction]
  );

  // live preview: decode every image first, then draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && items.length) {
      Promise.all(
        items.map(async (it) => {
          let img = imgCache.current.get(it.url);
          if (!img) {
            img = new Image();
            imgCache.current.set(it.url, img);
            img.src = it.url;
          }
          try {
            await img.decode();
          } catch {
            /* ignore decode errors */
          }
        })
      ).then(() => draw(canvas));
    }
  }, [items, draw]);

  const exportImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length || busy) return;
    setBusy(true);
    setResult(null);
    try {
      await Promise.all(items.map(async (it) => {
        let img = imgCache.current.get(it.url);
        if (!img) { img = new Image(); img.src = it.url; imgCache.current.set(it.url, img); }
        await img.decode();
      }));
      draw(canvas);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Export failed — the image may be too large for your device."))),
          format === "png" ? "image/png" : "image/jpeg",
          quality / 100
        )
      );
      const name = `${baseName("ppicola-merged")}.${format === "png" ? "png" : "jpg"}`;
      setResult({ name, blob });
    } catch (err) {
      setErrors([{ reason: err instanceof Error ? err.message : "Export failed." }]);
    } finally {
      setBusy(false);
    }
  }, [items, busy, format, quality, draw]);

  return (
    <ToolShell
      emoji="🧩"
      title={t("mergeImages.title")}
      badge={t("mergeImages.badge")}
      desc={t("mergeImages.desc")}
      aside={
        <>
          <ToolCard title={t("i2p.options")}>
            <div className="space-y-5">
              <OptionGroup
                label={t("mergeImages.optLayout")}
                value={direction}
                onChange={setDirection}
                cols={2}
                options={[
                  { value: "vertical", label: t("mergeImages.vertical") },
                  { value: "horizontal", label: t("mergeImages.horizontal") },
                ]}
              />
              <OptionGroup
                label={t("mergeImages.optAlign")}
                value={fit}
                onChange={setFit}
                cols={2}
                options={[
                  { value: "fit", label: t("mergeImages.fit") },
                  { value: "none", label: t("mergeImages.natural") },
                ]}
              />
              <Slider label={t("mergeImages.optSpacing")} value={spacing} min={0} max={120} step={4} format={(v) => `${v}px`} onChange={setSpacing} />
              <Slider label={t("mergeImages.optPadding")} value={padding} min={0} max={120} step={4} format={(v) => `${v}px`} onChange={setPadding} />
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t("mergeImages.optBg")}</p>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
                    aria-label={t("mergeImages.optBg")}
                  />
                  <div className="flex gap-1.5">
                    {["#ffffff", "#faf8f4", "#0f0d1a", "#6366f1", "#27b089"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBg(c)}
                        aria-label={`${t("mergeImages.optBg")} ${c}`}
                        className={`h-9 w-9 rounded-xl border-2 transition-transform hover:scale-110 ${bg === c ? "border-brand-500" : "border-black/10 dark:border-white/10"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <OptionGroup
                label={t("mergeImages.optFormat")}
                value={format}
                onChange={setFormat}
                cols={2}
                options={[
                  { value: "png", label: t("mergeImages.png") },
                  { value: "jpg", label: t("mergeImages.jpg") },
                ]}
              />
              {format === "jpg" && (
                <Slider label={t("mergeImages.optQuality")} value={quality} min={50} max={100} step={5} format={(v) => `${v}%`} onChange={setQuality} />
              )}
              {layout && layout.scale < 1 && (
                <p className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                  {t("mergeImages.warning", { pct: Math.round(layout.scale * 100) })}
                </p>
              )}
            </div>
          </ToolCard>

          <button onClick={exportImage} disabled={!items.length || busy} className="btn-primary w-full">
            {busy ? t("mergeImages.exporting") : t("mergeImages.export")}
          </button>

          <DownloadPanel result={result} onReset={clearAll} resetLabel={t("mergeImages.clearAllImages")} />
        </>
      }
    >
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />

      {items.length === 0 ? (
        <ToolCard>
          <DropZone
            accept="images"
            maxBytes={config.maxFileBytes}
            maxFiles={config.maxFiles}
            onFiles={addFiles}
            onRejected={setErrors}
            title={t("mergeImages.dzTitle")}
            subtitle={t("mergeImages.dzSub")}
            icon="🧩"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3 text-center">
            {[t("mergeImages.hint1"), t("mergeImages.hint2"), t("mergeImages.hint3")].map((t) => (
              <div key={t} className="rounded-2xl bg-brand-50/60 dark:bg-white/[0.04] px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t}
              </div>
            ))}
          </div>
        </ToolCard>
      ) : (
        <>
          <ToolCard title={`${t("mergeImages.yourImages")} (${items.length})`}>
            <SortableGrid
              items={items}
              idOf={(it: ImageItem) => it.id}
              onReorder={(next) => setItems(next)}
              renderItem={(it: ImageItem) => (
                <FileCard
                  thumbUrl={it.url}
                  title={it.name}
                  subtitle={`${formatBytes(it.size)} · ${it.width}×${it.height}`}
                  index={items.findIndex((x) => x.id === it.id)}
                  onRemove={() => removeItem(it.id)}
                />
              )}
            />
            <div className="mt-5">
              <DropZone
                compact
                accept="images"
                maxBytes={config.maxFileBytes}
                maxFiles={Math.max(0, config.maxFiles - items.length)}
                onFiles={addFiles}
                onRejected={setErrors}
                title={t("mergeImages.addMore")}
                subtitle={t("mergeImages.addMoreSub")}
                icon="➕"
              />
            </div>
          </ToolCard>

          <ToolCard
            title={t("mergeImages.livePreview")}
            actions={
              layout && (
                <span className="text-xs font-bold text-gray-400">
                  {layout.w} × {layout.h}px
                </span>
              )
            }
          >
            <div className="overflow-auto rounded-2xl bg-[repeating-conic-gradient(#eceaf6_0%_25%,#f7f6fb_0%_50%)] dark:bg-[repeating-conic-gradient(#221e3a_0%_25%,#1a1730_0%_50%)] bg-[length:18px_18px] p-4">
              <canvas ref={canvasRef} className="mx-auto max-h-[60vh] w-auto max-w-full rounded-xl shadow-soft" style={{ imageRendering: "auto" }} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={clearAll} className="rounded-xl px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                {t("mergeImages.clearAll")}
              </button>
            </div>
          </ToolCard>
        </>
      )}
    </ToolShell>
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
        <span className="font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
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
