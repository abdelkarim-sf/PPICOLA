"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ToolShell, { ToolCard } from "./ToolShell";
import DropZone from "./DropZone";
import SortableGrid from "./SortableGrid";
import FileCard from "./FileCard";
import ProgressBar from "./ProgressBar";
import DownloadPanel, { type DownloadResult } from "./DownloadPanel";
import ErrorList, { type ToolError } from "./ErrorList";
import OptionGroup from "./OptionGroup";
import { config } from "@/config";
import { formatBytes, uid, baseName } from "@/lib/files";
import { readFileAsArrayBuffer } from "@/lib/files";
import { loadPdfDocument, renderPageToCanvas, PdfOpenError, mergePdfBytes } from "@/lib/pdf";
import { makeZip, type ZipEntry } from "@/lib/download";
import { useT } from "@/i18n";

type PdfItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  bytes: ArrayBuffer;
  pageCount: number;
  thumb: string | null;
};

export default function MergePdfClient() {
  const { t } = useT();
  const [items, setItems] = useState<PdfItem[]>([]);
  const [mode, setMode] = useState<"merged" | "zip">("merged");
  const [busy, setBusy] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [errors, setErrors] = useState<ToolError[]>([]);

  const urlsRef = useRef<string[]>([]);
  useEffect(() => {
    const pool = urlsRef.current;
    return () => pool.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const loadPdfs = useCallback(async (files: File[]) => {
    setErrors([]);
    setResult(null);
    setLoadingCount((c) => c + files.length);
    const added: PdfItem[] = [];
    const errs: ToolError[] = [];
    for (const file of files) {
      try {
        const bytes = await readFileAsArrayBuffer(file);
        // pdf.js detaches the buffer it is given, so hand it a copy and keep the original for pdf-lib.
        const pdf = await loadPdfDocument(bytes.slice(0));
        let thumb: string | null = null;
        try {
          const canvas = await renderPageToCanvas(pdf, 1, 0.35);
          thumb = canvas.toDataURL("image/jpeg", 0.7);
        } catch {
          /* thumbnail optional */
        }
        const pageCount = pdf.numPages as number;
        pdf.destroy?.();
        added.push({ id: uid(), file, name: file.name, size: file.size, bytes, pageCount, thumb });
      } catch (err) {
        if (err instanceof PdfOpenError) {
          errs.push({ file: file.name, reason: t(`shared.errPdf${err.kind === "password" ? "Password" : err.kind === "corrupt" ? "Corrupt" : "Unknown"}`) });
        } else {
          errs.push({ file: file.name, reason: t("mergePdf.readErr") });
        }
      } finally {
        setLoadingCount((c) => Math.max(0, c - 1));
      }
    }
    if (added.length) setItems((prev) => [...prev, ...added]);
    if (errs.length) setErrors(errs);
  }, [t]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setResult(null);
    setErrors([]);
  }, []);

  const totalPages = items.reduce((a, i) => a + i.pageCount, 0);

  const convert = useCallback(async () => {
    if (!items.length || busy) return;
    setBusy(true);
    setErrors([]);
    setResult(null);
    try {
      if (mode === "merged") {
        setProgress({ done: 0, total: items.length, label: t("mergePdf.merging") });
        const bytes = await mergePdfBytes(
          items.map((i) => i.bytes),
          (done) => setProgress({ done, total: items.length, label: t("mergePdf.merging") })
        );
        const out = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const name = `${baseName("ppicola-merged")}.pdf`;
        setResult({ name, blob: out });
      } else {
        const entries: ZipEntry[] = items.map((i, idx) => ({
          name: `${String(idx + 1).padStart(2, "0")}-${i.name}`,
          blob: new Blob([i.bytes as BlobPart], { type: "application/pdf" }),
        }));
        setProgress({ done: 0, total: 1, label: t("mergePdf.compressing") });
        const zip = await makeZip(entries, (pct) =>
          setProgress({ done: pct / 100, total: 1, label: t("mergePdf.compressing") })
        );
        const name = "ppicola-pdfs.zip";
        setResult({ name, blob: zip });
      }
    } catch (err) {
      setErrors([
        {
          reason:
            err instanceof Error && err.message
              ? err.message
              : t("mergePdf.mergeErr"),
        },
      ]);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [items, busy, mode, t]);

  const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <ToolShell
      emoji="📚"
      title={t("mergePdf.title")}
      badge={t("mergePdf.badge")}
      desc={t("mergePdf.desc")}
      aside={
        <>
          <ToolCard title={t("i2p.options")}>
            <div className="space-y-5">
              <OptionGroup
                label={t("mergePdf.optOutput")}
                value={mode}
                onChange={setMode}
                cols={2}
                options={[
                  { value: "merged", label: t("mergePdf.onePdf") },
                  { value: "zip", label: t("mergePdf.zipOriginals") },
                ]}
              />
              {items.length > 0 && (
                <p className="rounded-2xl bg-brand-50/70 dark:bg-white/5 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {t("mergePdf.pdfsCount", { n: items.length, p: totalPages })}
                </p>
              )}
            </div>
          </ToolCard>

          <button onClick={convert} disabled={!items.length || busy} className="btn-primary w-full">
            {busy ? t("mergePdf.working") : mode === "merged" ? t("mergePdf.merge") : t("mergePdf.createZip")}
          </button>

          {busy && progress && (
            <ToolCard>
              <ProgressBar value={pct} label={progress.label} />
            </ToolCard>
          )}

          <DownloadPanel result={result} onReset={clearAll} resetLabel={t("mergePdf.clearFiles")} />
        </>
      }
    >
      <ErrorList errors={errors} onDismiss={() => setErrors([])} />

      {loadingCount > 0 && (
        <ToolCard>
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {loadingCount > 1 ? t("mergePdf.reading", { n: loadingCount }) : t("mergePdf.readingOne")}
            </p>
          </div>
        </ToolCard>
      )}

      {items.length === 0 && loadingCount === 0 ? (
        <ToolCard>
          <DropZone
            accept="pdfs"
            maxBytes={config.maxFileBytes}
            maxFiles={config.maxFiles}
            onFiles={loadPdfs}
            onRejected={setErrors}
            title={t("mergePdf.dzTitle")}
            subtitle={t("mergePdf.dzSub")}
            icon="📚"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3 text-center">
            {[t("mergePdf.hint1"), t("mergePdf.hint2"), t("mergePdf.hint3")].map((h) => (
              <div key={h} className="rounded-2xl bg-brand-50/60 dark:bg-white/[0.04] px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {h}
              </div>
            ))}
          </div>
        </ToolCard>
      ) : (
        items.length > 0 && (
          <ToolCard
            title={`${t("mergePdf.yourPdfs")} (${items.length})`}
            actions={
              <button onClick={clearAll} className="rounded-xl px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                {t("mergePdf.clearAll")}
              </button>
            }
          >
            <SortableGrid
              items={items}
              idOf={(it: PdfItem) => it.id}
              onReorder={(next) => setItems(next)}
              renderItem={(it: PdfItem) => (
                <FileCard
                  thumbUrl={it.thumb ?? undefined}
                  emoji="📕"
                  title={it.name}
                  subtitle={`${formatBytes(it.size)} · ${it.pageCount} ${it.pageCount === 1 ? t("mergePdf.pageWord") : t("mergePdf.pagesWord")}`}
                  index={items.findIndex((x) => x.id === it.id)}
                  onRemove={() => removeItem(it.id)}
                />
              )}
            />
            <div className="mt-5">
              <DropZone
                compact
                accept="pdfs"
                maxBytes={config.maxFileBytes}
                maxFiles={Math.max(0, config.maxFiles - items.length)}
                onFiles={loadPdfs}
                onRejected={setErrors}
                title={t("mergePdf.addMore")}
                subtitle={t("mergePdf.addMoreSub")}
                icon="➕"
              />
            </div>
          </ToolCard>
        )
      )}
    </ToolShell>
  );
}
