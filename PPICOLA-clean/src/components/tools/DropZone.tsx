"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { validateFiles, isHeicFile, type AcceptKind } from "@/lib/files";
import { useT } from "@/i18n";

type Props = {
  accept: AcceptKind;
  multiple?: boolean;
  maxBytes: number;
  maxFiles: number;
  onFiles: (files: File[]) => void;
  onRejected?: (rejected: { file: string; reason: string }[]) => void;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  icon?: string;
};

/** Reusable animated drop zone, styled to the PPICOLA design system. */
export default function DropZone({
  accept,
  multiple = true,
  maxBytes,
  maxFiles,
  onFiles,
  onRejected,
  compact = false,
  title = "Drag & drop your files here",
  subtitle = "or tap to browse — everything stays on your device",
  icon = "📥",
}: Props) {
  const { t } = useT();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list);
      if (incoming.length === 0) return;
      const heic = incoming.filter(isHeicFile);
      const rest = incoming.filter((f) => !isHeicFile(f));
      const heicNote = t("shared.dzHeic");
      const { ok, rejected } = validateFiles(rest, {
        accept,
        maxBytes,
        maxFiles,
        heicNote,
        messages: {
          unsupported: t("shared.errUnsupported"),
          tooBig: (size, max) => t("shared.errTooBig", { size, max }),
          maxFiles: (n) => t("shared.errMaxFiles", { n }),
        },
      });
      const allRejected = [...heic.map((f) => ({ file: f.name, reason: heicNote })), ...rejected];
      if (ok.length) onFiles(ok);
      if (allRejected.length) onRejected?.(allRejected);
    },
    [accept, maxBytes, maxFiles, onFiles, onRejected, t]
  );

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handle(e.dataTransfer.files);
      }}
      animate={{
        scale: dragOver ? 1.01 : 1,
        borderColor: dragOver ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.25)",
      }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className="relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-white/60 dark:bg-white/[0.03] text-center shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/30"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-brand-300/30 to-mint-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-gradient-to-tr from-violet-300/20 to-brand-300/20 blur-3xl" />

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        className="hidden"
        accept={accept === "pdf" || accept === "pdfs" ? "application/pdf,.pdf" : accept === "images+pdf" ? "image/*,.pdf" : "image/jpeg,image/png,image/webp"}
        onChange={(e) => {
          handle(e.target.files ?? []);
          e.target.value = "";
        }}
      />

      <div className={`relative flex flex-col items-center px-6 ${compact ? "py-7" : "py-10 sm:py-12"}`}>
        <motion.span
          animate={{ y: dragOver ? -5 : 0, rotate: dragOver ? -8 : 0 }}
          className={`${compact ? "h-14 w-14 text-2xl rounded-2xl" : "h-16 w-16 sm:h-20 sm:w-20 text-3xl sm:text-4xl rounded-3xl"} flex items-center justify-center bg-gradient-to-br from-brand-500 to-mint-400 shadow-lift`}
        >
          {dragOver ? "✨" : icon}
        </motion.span>
        <h3 className={`${compact ? "mt-3 text-base" : "mt-4 text-lg sm:text-xl"} font-bold`}>{title}</h3>
        <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-white/5 border border-brand-100 dark:border-white/10 px-3.5 py-1 text-[11px] font-semibold text-brand-600 dark:text-brand-300">
          {t("shared.dzPrivate")}
        </span>
      </div>
    </motion.div>
  );
}
