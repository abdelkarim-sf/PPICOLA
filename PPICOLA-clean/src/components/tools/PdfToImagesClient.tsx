"use client";

import { useT } from "@/i18n";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ToolShell, { ToolCard } from "./ToolShell";
import DropZone from "./DropZone";
import ProgressBar from "./ProgressBar";
import DownloadPanel, { type DownloadResult } from "./DownloadPanel";
import ErrorList, { type ToolError } from "./ErrorList";
import OptionGroup from "./OptionGroup";
import ImageEditorModal from "./ImageEditorModal";
import FileCard from "./FileCard";
import { config } from "@/config";
import { formatBytes, baseName, readFileAsArrayBuffer } from "@/lib/files";
import { loadPdfDocument, renderPageToCanvas, renderPageToBlob, PdfOpenError } from "@/lib/pdf";
import type { ImageEdits } from "@/lib/image";
import { saveBlob, makeZip, type ZipEntry } from "@/lib/download";

type PageItem = {
  n: number;
  thumb: string | null;
  selected: boolean;
  edited: { edits: ImageEdits; blob: Blob; previewUrl: string } | null;
};

type DocState = {
  name: string;
  size: number;
  pageCount: number;
  pages: PageItem[];
};

export default function PdfToImagesClient() {
  const { t } = useT();
  const [doc, setDoc] = useState<DocState | null>(null);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<"jpg" | "png">("jpg");
  const [quality, setQuality] = useState(85);
  const [scale, setScale] = useState<"1" | "2" | "3">("2");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [errors, setErrors] = useState<ToolError[]>([]);
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [editPage, setEditPage] = useState<number | null>(null);

  const pdfRef = useRef<any>(null);
  const bytesRef = useRef<ArrayBuffer | null>(null);
  const fileRef = useRef<File | null>(null);
  const scaleNum = Number(scale);

  const reset = useCallback(() => {
    pdfRef.current?.destroy?.();
    pdfRef.current = null;
    bytesRef.current = null;
    fileRef.current = null;
    setDoc(null);
    setResult(null);
    setErrors([]);
    setPreviewPage(null);
    setEditPage(null);
  }, []);

  const loadPdf = useCallback(async (file: File) => {
    setLoading(true);
    setErrors([]);
    setResult(null);
    try {
      const bytes = await readFileAsArrayBuffer(file);
      const pdf = await loadPdfDocument(bytes);
      pdfRef.current?.destroy?.();
      pdfRef.current = pdf;
      bytesRef.current = bytes;
      fileRef.current = file;
      const pageCount = pdf.numPages as number;
      setDoc({
        name: file.name,
        size: file.size,
        pageCount,
        pages: Array.from({ length: pageCount }, (_, i) => ({
          n: i + 1,
          thumb: null,
          selected: true,
          edited: null,
        })),
      });
    } catch (err) {
      if (err instanceof PdfOpenError) {
        setErrors([{ file: file.name, reason: t(`shared.errPdf${err.kind === "password" ? "Password" : err.kind === "corrupt" ? "Corrupt" : "Unknown"}`) }]);
      } else {
        setErrors([
          {
            file: file.name,
            reason: t("p2i.readErr"),
          },
        ]);
      }
      pdfRef.current = null;
      bytesRef.current = null;
      fileRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  // destroy pdf on unmount
  useEffect(() => {
    return () => {
      pdfRef.current?.destroy?.();
    };
  }, []);

  const togglePage = (n: number) =>
    setDoc((d) =>
      d ? { ...d, pages: d.pages.map((p) => (p.n === n ? { ...p, selected: !p.selected } : p)) } : d
    );
  const selectAll = () => setDoc((d) => (d ? { ...d, pages: d.pages.map((p) => ({ ...p, selected: true })) } : d));
  const selectNone = () => setDoc((d) => (d ? { ...d, pages: d.pages.map((p) => ({ ...p, selected: false })) } : d));

  const selectedCount = doc?.pages.filter((p) => p.selected).length ?? 0;

  const exportImages = useCallback(async () => {
    const pdf = pdfRef.current;
    const file = fileRef.current;
    if (!pdf || !file || !doc || busy) return;
    setBusy(true);
    setErrors([]);
    setResult(null);
    try {
      const selected = doc.pages.filter((p) => p.selected);
      const base = baseName(file.name);
      const ext = format === "png" ? "png" : "jpg";
      const blobs: { name: string; blob: Blob }[] = [];

      for (let i = 0; i < selected.length; i++) {
        const p = selected[i];
        setProgress({ done: i, total: selected.length, label: t("p2i.rendering", { n: p.n }) });
        let blob: Blob;
        if (p.edited) {
          const { transformImage, cropAndFilter, canvasToBlob } = await import("@/lib/image");
          const raw = await renderPageToCanvas(pdf, p.n, scaleNum);
          const e = p.edited.edits;
          const transformed = transformImage(raw, raw.width, raw.height, e.rotation, e.flipH, e.flipV);
          const ratio = scaleNum / 1.5;
          const crop = e.crop ? { x: e.crop.x * ratio, y: e.crop.y * ratio, width: e.crop.width * ratio, height: e.crop.height * ratio } : { x: 0, y: 0, width: transformed.width, height: transformed.height };
          blob = await canvasToBlob(cropAndFilter(transformed, crop, e.brightness, e.contrast, 16000), format === "png" ? "image/png" : "image/jpeg", quality / 100);
        } else {
          blob = await renderPageToBlob(pdf, p.n, scaleNum, format, quality / 100);
        }
        blobs.push({ name: `${String(i + 1).padStart(2, "0")}-page-${p.n}.${ext}`, blob });
        setProgress({ done: i + 1, total: selected.length, label: t("p2i.pageDone", { n: p.n, a: i + 1, b: selected.length }) });
      }

      if (blobs.length === 1) {
        const name = `${base}-page-${selected[0].n}.${ext}`;
        await saveBlob(blobs[0].blob, name);
        setResult({ name, blob: blobs[0].blob });
      } else {
        const entries: ZipEntry[] = blobs;
        const zip = await makeZip(entries, (pct) =>
          setProgress({ done: pct / 100, total: 1, label: t("p2i.compressing") })
        );
        const name = `${base}-pages.zip`;
        setResult({ name, blob: zip });
      }
    } catch (err) {
      setErrors([
        {
          reason:
            err instanceof Error && err.message
              ? err.message
              : t("shared.errGeneric"),
        },
      ]);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [doc, busy, format, quality, scaleNum, t]);

  const preview = previewPage ? doc?.pages.find((p) => p.n === previewPage) ?? null : null;
  const editItem = editPage ? doc?.pages.find((p) => p.n === editPage) ?? null : null;

  return (
    <ToolShell
      emoji="📄"
      title={t("p2i.title")}
      badge={t("p2i.badge")}
      desc={t("p2i.desc")}
      aside={
        <>
          <ToolCard title={t("i2p.options")}>
            <div className="space-y-5">
              <OptionGroup
                label={t("p2i.optFormat")}
                value={format}
                onChange={setFormat}
                cols={2}
                options={[
                  { value: "jpg", label: t("p2i.jpg") },
                  { value: "png", label: t("p2i.png") },
                ]}
              />
              <div>
                <p className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t("p2i.optQuality")}</span>
                  <span className="font-bold text-brand-600 dark:text-brand-300">{quality}%</span>
                </p>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-brand-100 dark:bg-white/10 accent-brand-500"
                  aria-label={t("p2i.optQuality")}
                />
              </div>
              <OptionGroup
                label={t("p2i.optResolution")}
                value={scale}
                onChange={(v) => setScale(v as "1" | "2" | "3")}
                options={[
                  { value: "1", label: t("p2i.dpi1") },
                  { value: "2", label: t("p2i.dpi2") },
                  { value: "3", label: t("p2i.dpi3") },
                ]}
              />
              {doc && (
                <p className="rounded-2xl bg-brand-50/70 dark:bg-white/5 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {t("p2i.pagesSelected", { n: selectedCount, total: doc.pageCount })}
                </p>
              )}
            </div>
          </ToolCard>

          <button
            onClick={exportImages}
            disabled={!doc || !selectedCount || busy}
            className="btn-primary w-full"
          >
            {busy ? t("p2i.exporting") : selectedCount <= 1 ? t("p2i.downloadImage") : t("p2i.exportN", { n: selectedCount })}
          </button>

          {busy && progress && (
            <ToolCard>
              <ProgressBar value={(progress.done / Math.max(1, progress.total)) * 100} label={progress.label} />
            </ToolCard>
          )}

          <DownloadPanel result={result} onReset={reset} resetLabel={t("p2i.openAnother")} />
        </>
      }
    >
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />

      {!doc && !loading && (
        <ToolCard>
          <DropZone
            accept="pdf"
            multiple={false}
            maxBytes={config.maxFileBytes}
            maxFiles={1}
            onFiles={(f) => loadPdf(f[0])}
            onRejected={setErrors}
            title={t("p2i.dzTitle")}
            subtitle={t("p2i.dzSub")}
            icon="📄"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3 text-center">
            {[t("p2i.hint1"), t("p2i.hint2"), t("p2i.hint3")].map((t) => (
              <div key={t} className="rounded-2xl bg-brand-50/60 dark:bg-white/[0.04] px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t}
              </div>
            ))}
          </div>
        </ToolCard>
      )}

      {loading && (
        <ToolCard>
          <div className="flex items-center gap-4">
            <div className="skeleton h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3 rounded-full" />
              <div className="skeleton h-3 w-1/3 rounded-full" />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">{t("p2i.opening")}</p>
        </ToolCard>
      )}

      {doc && (
        <ToolCard
          title={`${doc.name} · ${formatBytes(doc.size)} · ${doc.pageCount} ${t("mergePdf.pagesWord")}`}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="rounded-xl px-3 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-white/10">
                {t("p2i.selectAll")}
              </button>
              <button onClick={selectNone} className="rounded-xl px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-brand-50 dark:hover:bg-white/10">
                {t("p2i.selectNone")}
              </button>
              <button onClick={reset} className="rounded-xl px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                {t("p2i.clear")}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {doc.pages.map((p) => (
              <FileCard
                key={p.n}
                thumbUrl={p.edited?.previewUrl ?? p.thumb ?? undefined}
                emoji="📄"
                title={`${t("p2i.pageWord")} ${p.n}`}
                subtitle={p.edited ? t("p2i.edited") : undefined}
                index={p.n - 1}
                selected={p.selected}
                onClick={() => togglePage(p.n)}
                onEdit={() => setPreviewPage(p.n)}
                editLabel={t("p2i.editThisPage")}
                renderThumb={
                  p.thumb || p.edited
                    ? undefined
                    : () => (
                        <PageThumb
                          pdf={pdfRef.current}
                          n={p.n}
                          onReady={(url) =>
                            setDoc((d) =>
                              d
                                ? { ...d, pages: d.pages.map((x) => (x.n === p.n ? { ...x, thumb: url } : x)) }
                                : d
                            )
                          }
                        />
                      )
                }
              />
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            {t("p2i.previewHint")}
          </p>
        </ToolCard>
      )}

      {/* Page preview modal */}
      <AnimatePresence>
        {preview && !editItem && (
          <PagePreview
            key={preview.n}
            page={preview}
            pdf={pdfRef.current}
            scale={scaleNum}
            onClose={() => setPreviewPage(null)}
            onEdit={() => setEditPage(preview.n)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editItem && (
          <EditPageModal
            key={editItem.n}
            page={editItem}
            pdf={pdfRef.current}
            onCancel={() => setEditPage(null)}
            onApply={(edits, blob, previewUrl) => {
              setDoc((d) =>
                d
                  ? {
                      ...d,
                      pages: d.pages.map((p) => {
                        if (p.n !== editItem.n) return p;
                        if (p.edited) URL.revokeObjectURL(p.edited.previewUrl);
                        return { ...p, edited: { edits, blob, previewUrl } };
                      }),
                    }
                  : d
              );
              setEditPage(null);
              setPreviewPage(null);
            }}
          />
        )}
      </AnimatePresence>
    </ToolShell>
  );
}

/** Lazy thumbnail: only renders the page when it nears the viewport. */
function PageThumb({ pdf, n, onReady }: { pdf: any; n: number; onReady: (dataUrl: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting) || done.current) return;
        done.current = true;
        io.disconnect();
        try {
          const canvas = await renderPageToCanvas(pdf, n, 0.35);
          onReady(canvas.toDataURL("image/jpeg", 0.7));
        } catch {
          /* leave placeholder */
        }
      },
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pdf, n, onReady]);

  return (
    <div ref={ref} className="flex aspect-[3/4] w-full items-center justify-center bg-gray-100 dark:bg-white/5">
      <div className="skeleton h-10 w-10 rounded-xl" />
    </div>
  );
}

function PagePreview({
  page,
  pdf,
  scale,
  onClose,
  onEdit,
}: {
  page: PageItem;
  pdf: any;
  scale: number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t } = useT();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    if (page.edited) {
      setUrl(page.edited.previewUrl);
      return;
    }
    renderPageToCanvas(pdf, page.n, Math.min(scale, 2))
      .then((canvas) => {
        if (cancelled) return;
        const blob = canvas.toDataURL("image/jpeg", 0.85);
        setUrl(blob);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [page, pdf, scale]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("p2i.previewTitle", { n: page.n })}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171427] shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 px-5 py-4">
          <h2 className="font-extrabold">{t("p2i.previewTitle", { n: page.n })}</h2>
          <button
            onClick={onClose}
            aria-label={t("shared.closePreview")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-black/30 p-4">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={t("p2i.previewTitle", { n: page.n })} className="mx-auto max-h-[60vh] rounded-xl shadow-soft" />
          ) : (
            <div className="flex h-64 items-center justify-center">
              <div className="skeleton h-40 w-32 rounded-xl" />
            </div>
          )}
        </div>
        <div className="flex gap-2.5 border-t border-black/5 dark:border-white/10 px-5 py-4">
          <button onClick={onEdit} className="btn-ghost flex-1 !py-2.5 text-sm">
            {t("p2i.editThisPage")}
          </button>
          <button onClick={onClose} className="btn-primary flex-1 !py-2.5 text-sm">
            {t("p2i.done")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Loads the page image, opens the shared editor, and stores edits for that page. */
function EditPageModal({
  page,
  pdf,
  onCancel,
  onApply,
}: {
  page: PageItem;
  pdf: any;
  onCancel: () => void;
  onApply: (edits: ImageEdits, blob: Blob, previewUrl: string) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    async function run() {
      const canvas = await renderPageToCanvas(pdf, page.n, 1.5);
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("render failed"))), "image/jpeg", 0.92)
      );
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setFileUrl(objectUrl);
    }
    run().catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.n, pdf]);

  if (!fileUrl) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        role="dialog"
        aria-modal="true"
      >
        <div className="skeleton h-40 w-40 rounded-3xl" />
      </motion.div>
    );
  }

  return (
    <ImageEditorModal
      open
      fileUrl={fileUrl}
      initial={page.edited?.edits ?? null}
      onCancel={onCancel}
      onApply={onApply}
    />
  );
}
