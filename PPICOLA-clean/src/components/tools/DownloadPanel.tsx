"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "./Confetti";
import { useT } from "@/i18n";
import { isEmbedded, saveBlob, shareableFile } from "@/lib/download";

export type DownloadResult = {
  name: string;
  blob: Blob;
};

/** Success panel with file name, size, download button and a subtle confetti burst. */
export default function DownloadPanel({
  result,
  downloading,
  onReset,
  resetLabel,
  downloadLabel,
}: {
  result: DownloadResult | null;
  downloading?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  downloadLabel?: string;
}) {
  const { t } = useT();
  const [confettiKey, setConfettiKey] = useState(0);
  const prev = useRef<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [embedded, setEmbedded] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    setEmbedded(isEmbedded());
  }, []);

  useEffect(() => {
    setAttempted(false);
    setFailed(false);
    setShareError(false);
    setShareFile(result ? shareableFile(result.blob, result.name) : null);
    if (!result) { setUrl(null); return; }
    const objectUrl = URL.createObjectURL(result.blob);
    setUrl(objectUrl);
    return () => {
      // Retain briefly after removal so a pending download can finish.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    };
  }, [result]);

  function download() {
    if (!result) return;
    setAttempted(true);
    setFailed(!saveBlob(result.blob, result.name));
  }

  async function share() {
    if (!shareFile) return;
    try {
      setShareError(false);
      await navigator.share({ files: [shareFile], title: result?.name });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareError(true);
    }
  }

  useEffect(() => {
    if (result && result.name !== prev.current) {
      prev.current = result.name;
      setConfettiKey((k) => k + 1);
    }
    if (!result) prev.current = null;
  }, [result]);

  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative overflow-hidden rounded-3xl border border-mint-200 dark:border-white/10 bg-gradient-to-br from-mint-50 to-brand-50 dark:from-white/[0.07] dark:to-white/[0.03] p-6 shadow-soft"
        >
          {confettiKey > 0 && <Confetti key={confettiKey} />}
          <div className="flex items-start gap-4">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-400 to-mint-600 text-xl text-white shadow-lift"
            >
              ✅
            </motion.span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">{t("shared.readyT")}</h3>
              <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400" title={result.name}>
                {result.name}
              </p>
              <p className="text-xs font-semibold text-mint-700 dark:text-mint-300">
                {t("shared.readySize", { n: (result.blob.size / 1024 / 1024).toFixed(2) })}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              onClick={download}
              disabled={downloading}
              className="btn-primary w-full"
            >
              ⬇️ {downloadLabel ?? t("shared.download")}
            </button>
            {url && result.blob.type.startsWith("image/") && (
              <div className="overflow-hidden rounded-2xl bg-white/70 dark:bg-white/5 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={t("shared.resultPreview")} className="mx-auto max-h-64 w-auto max-w-full rounded-xl" />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("shared.holdImage")}</p>
              </div>
            )}
            {url && (embedded || attempted || failed) && (
              <div className="rounded-2xl bg-white/70 dark:bg-white/5 p-3 text-sm text-gray-600 dark:text-gray-300" role="status">
                <p>{embedded || failed ? t("shared.blockedDownload") : t("shared.downloadAlternative")}</p>
                {(embedded || failed) && <>
                  <button type="button" className="btn-ghost mt-2 !px-3 !py-2 text-sm" onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}>{t("shared.openNewTab")}</button>
                  <p className="mt-1 text-xs">{t("shared.newTabNote")}</p>
                </>}
                <a href={url} download={result.name} className="mt-2 block break-all font-bold text-brand-600 underline dark:text-brand-300">{t("shared.saveLink")}: {result.name}</a>
              </div>
            )}
            {shareFile && <button type="button" onClick={share} className="btn-ghost w-full">{t("shared.shareSave")}</button>}
            {shareError && <p role="status" className="text-xs text-rose-600">{t("shared.shareError")}</p>}
            {onReset && (
              <button onClick={onReset} className="btn-ghost w-full">
                {resetLabel ?? t("shared.startOver")}
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rounded-3xl border border-dashed border-brand-200 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-6 text-center"
        >
              <span className="text-2xl">🎁</span>
              <p className="mt-2 text-sm font-semibold">{t("shared.idleT")}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t("shared.idleD")}
              </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
