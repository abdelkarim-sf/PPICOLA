"use client";

import { useT } from "@/i18n";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ToolShell, { ToolCard } from "./ToolShell";
import DropZone from "./DropZone";
import SortableGrid from "./SortableGrid";
import FileCard from "./FileCard";
import ProgressBar from "./ProgressBar";
import DownloadPanel, { type DownloadResult } from "./DownloadPanel";
import ErrorList, { type ToolError } from "./ErrorList";
import OptionGroup from "./OptionGroup";
import ImageEditorModal from "./ImageEditorModal";
import { config } from "@/config";
import { formatBytes, uid, baseName } from "@/lib/files";
import {
  fileToJpegBlob,
  estimateJpegBytes,
  loadImageDims,
  type ImageEdits,
} from "@/lib/image";
import { imagesToPdf, imageToPdfBlob, type PdfLayoutOptions, type PageSizeKey } from "@/lib/pdf";
import { makeZip, type ZipEntry } from "@/lib/download";

type ImageItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
  width: number;
  height: number;
  edited: { edits: ImageEdits; blob: Blob; previewUrl: string } | null;
};

type OutputMode = "merged" | "zip";

export default function ImagesToPdfClient() {
  const { t } = useT();
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeKey>("a4");
  const [orientation, setOrientation] = useState<PdfLayoutOptions["orientation"]>("auto");
  const [margin, setMargin] = useState<PdfLayoutOptions["margin"]>("small");
  const [quality, setQuality] = useState(85);
  const [mode, setMode] = useState<OutputMode>("merged");
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [errors, setErrors] = useState<ToolError[]>([]);
  const [editorFor, setEditorFor] = useState<string | null>(null);

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
        added.push({
          id: uid(),
          file,
          name: file.name,
          size: file.size,
          url,
          width: dims.width,
          height: dims.height,
          edited: null,
        });
      } catch {
        errs.push({ file: file.name, reason: t("shared.errImageRead") });
      }
    }
    if (added.length) setItems((prev) => [...prev, ...added]);
    if (errs.length) setErrors(errs);
  }, [t]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        if (item.edited) URL.revokeObjectURL(item.edited.previewUrl);
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => {
        if (i.edited) URL.revokeObjectURL(i.edited.previewUrl);
        URL.revokeObjectURL(i.url);
      });
      return [];
    });
    setResult(null);
    setErrors([]);
  }, []);

  const editorItem = editorFor ? items.find((i) => i.id === editorFor) ?? null : null;

  const layout: PdfLayoutOptions = useMemo(
    () => ({ pageSize, orientation, margin }),
    [pageSize, orientation, margin]
  );

  const estimate = useMemo(() => {
    const imgs = items.reduce(
      (acc, it) => acc + estimateJpegBytes(it.width, it.height, quality),
      0
    );
    return imgs + items.length * 8192;
  }, [items, quality]);

  const convert = useCallback(async () => {
    if (!items.length || busy) return;
    setBusy(true);
    setErrors([]);
    setResult(null);
    try {
      setProgress({ done: 0, total: items.length, label: t("i2p.preparing") });
      const blobs: Blob[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        let blob = it.edited?.blob ?? null;
        if (!blob) blob = await fileToJpegBlob(it.file, quality / 100);
        blobs.push(blob);
        setProgress({ done: i + 1, total: items.length, label: t("i2p.converting", { a: i + 1, b: items.length }) });
      }

      const base = filename.trim() ? baseName(filename) : mode === "merged" ? "ppicola-images" : "ppicola-pdfs";

      if (mode === "merged") {
        const bytes = await imagesToPdf(
          blobs.map((blob) => ({ blob })),
          layout,
          (done, total) => setProgress({ done, total, label: t("i2p.building") })
        );
        const out = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const name = `${base}.pdf`;
        setResult({ name, blob: out });
      } else {
        const entries: ZipEntry[] = [];
        for (let i = 0; i < blobs.length; i++) {
          const b = await imageToPdfBlob(blobs[i], layout);
          entries.push({
            name: `${String(i + 1).padStart(2, "0")}-${baseName(items[i].name)}.pdf`,
            blob: b,
          });
          setProgress({ done: i + 1, total: blobs.length, label: t("i2p.creatingPdf", { a: i + 1, b: blobs.length }) });
        }
        const zip = await makeZip(entries, (pct) =>
          setProgress({ done: pct / 100, total: 1, label: t("i2p.compressing") })
        );
        const name = `${base}.zip`;
        setResult({ name, blob: zip });
      }
    } catch (err) {
      setErrors([
        {
          reason:
            err instanceof Error && err.message
              ? err.message
              : t("i2p.pdfErr"),
        },
      ]);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [items, busy, quality, mode, layout, filename, t]);

  const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <ToolShell
      emoji="🖼️"
      title={t("i2p.title")}
      badge={t("i2p.badge")}
      desc={t("i2p.desc")}
      aside={
        <>
          <ToolCard title={t("i2p.options")}>
            <div className="space-y-5">
              <OptionGroup
                label={t("i2p.optPageSize")}
                value={pageSize}
                onChange={setPageSize}
                options={[
                  { value: "a4", label: t("i2p.a4") },
                  { value: "letter", label: t("i2p.letter") },
                  { value: "fit", label: t("i2p.fit") },
                ]}
              />
              <OptionGroup
                label={t("i2p.optOrientation")}
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: "auto", label: t("i2p.auto") },
                  { value: "portrait", label: t("i2p.portrait") },
                  { value: "landscape", label: t("i2p.landscape") },
                ]}
              />
              <OptionGroup
                label={t("i2p.optMargins")}
                value={margin}
                onChange={setMargin}
                options={[
                  { value: "none", label: t("i2p.none") },
                  { value: "small", label: t("i2p.small") },
                  { value: "medium", label: t("i2p.medium") },
                ]}
              />
              <div>
                <p className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t("i2p.optQuality")}</span>
                  <span className="font-bold text-brand-600 dark:text-brand-300">{quality}%</span>
                </p>
                <input
                  type="range"
                  min={50}
                  max={95}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-100 dark:bg-white/10 accent-brand-500"
                  aria-label={t("i2p.optQuality")}
                />
              </div>
              <OptionGroup
                label={t("i2p.optOutput")}
                value={mode}
                onChange={setMode}
                cols={2}
                options={[
                  { value: "merged", label: t("i2p.onePdf") },
                  { value: "zip", label: t("i2p.zipPdfs") },
                ]}
              />
              <div>
                <label htmlFor="filename" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t("i2p.fileName")}
                </label>
                <input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder={mode === "merged" ? "ppicola-images" : "ppicola-pdfs"}
                  className="w-full rounded-2xl border border-brand-100 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-3 text-sm outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20"
                />
              </div>
              <p className="rounded-2xl bg-brand-50/70 dark:bg-white/5 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                {t("i2p.estSize")}{" "}
                <strong className="text-brand-600 dark:text-brand-300">{formatBytes(estimate)}</strong>
                {items.length > 0 && ` · ${items.length} ${items.length === 1 ? t("i2p.pageWord") : t("i2p.pagesWord")}`}
              </p>
            </div>
          </ToolCard>

          <button onClick={convert} disabled={!items.length || busy} className="btn-primary w-full">
            {busy ? t("i2p.working") : mode === "merged" ? t("i2p.createPdf") : t("i2p.createZip")}
          </button>

          {busy && progress && (
            <ToolCard>
              <ProgressBar value={pct} label={progress.label} />
            </ToolCard>
          )}

          <DownloadPanel result={result} onReset={clearAll} />
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
            title={t("i2p.dzTitle")}
            subtitle={t("i2p.dzSub")}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3 text-center">
            {[t("i2p.hint1"), t("i2p.hint2"), t("i2p.hint3")].map((h) => (
              <div key={h} className="rounded-2xl bg-brand-50/60 dark:bg-white/[0.04] px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {h}
              </div>
            ))}
          </div>
        </ToolCard>
      ) : (
        <ToolCard
          title={`${t("i2p.yourImages")} (${items.length})`}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={clearAll} className="rounded-xl px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                {t("i2p.clearAll")}
              </button>
            </div>
          }
        >
          <SortableGrid
            items={items}
            idOf={(it: ImageItem) => it.id}
            onReorder={(next) => setItems(next)}
            renderItem={(it: ImageItem) => (
              <FileCard
                thumbUrl={it.edited?.previewUrl ?? it.url}
                title={it.name}
                subtitle={`${formatBytes(it.size)} · ${it.width}×${it.height}${it.edited ? ` · ${t("i2p.edited")}` : ""}`}
                index={items.findIndex((x) => x.id === it.id)}
                onRemove={() => removeItem(it.id)}
                onEdit={() => setEditorFor(it.id)}
                editLabel={t("shared.editBtn")}
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
              title={t("i2p.addMore")}
              subtitle={t("i2p.addMoreSub")}
              icon="➕"
            />
          </div>
        </ToolCard>
      )}

      <AnimatePresence>
        {editorItem && (
          <ImageEditorModal
            key={editorItem.id}
            open
            fileUrl={editorItem.url}
            initial={editorItem.edited?.edits ?? null}
            onCancel={() => setEditorFor(null)}
            onApply={(edits, blob, previewUrl) => {
              setItems((prev) =>
                prev.map((it) => {
                  if (it.id !== editorItem.id) return it;
                  if (it.edited) URL.revokeObjectURL(it.edited.previewUrl);
                  return { ...it, edited: { edits, blob, previewUrl } };
                })
              );
              setEditorFor(null);
            }}
          />
        )}
      </AnimatePresence>
    </ToolShell>
  );
}
