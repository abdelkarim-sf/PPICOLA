"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useT } from "@/i18n";
import { config } from "@/config";

type Detected = {
  images: number;
  pdfs: number;
};

export default function DropZone() {
  const { t } = useT();
  const [dragOver, setDragOver] = useState(false);
  const [detected, setDetected] = useState<Detected | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = useCallback((files: File[] | FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    let images = 0;
    let pdfs = 0;
    for (const f of list) {
      if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) pdfs++;
      else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name)) images++;
    }
    if (images || pdfs) setDetected({ images, pdfs });
  }, []);

  const suggestion =
    detected && detected.pdfs > 0 && detected.images === 0
      ? {
          href: "/pdf-to-images",
          emoji: "📄",
          title: t("home.sugPdfT"),
          desc: t("home.sugPdfD", {
            n: detected.pdfs === 1 ? t("home.itsPage") : `${detected.pdfs} ${t("home.pagesWord")}`,
          }),
          cta: t("home.sugPdfCta"),
        }
      : detected && detected.images > 0 && detected.pdfs === 0
      ? {
          href: "/images-to-pdf",
          emoji: "🖼️",
          title: t("home.sugImgT"),
          desc: t("home.sugImgD"),
          cta: t("home.sugImgCta"),
        }
      : detected && detected.images > 0 && detected.pdfs > 0
      ? {
          href: "/merge-pdfs",
          emoji: "🧩",
          title: t("home.sugMixT"),
          desc: t("home.sugMixD"),
          cta: t("home.sugMixCta"),
        }
      : null;

  return (
    <div className="w-full">
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          analyze(e.dataTransfer.files);
        }}
        animate={{
          scale: dragOver ? 1.015 : 1,
          borderColor: dragOver ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.25)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className="relative cursor-pointer overflow-hidden rounded-4xl border-2 border-dashed bg-white/60 dark:bg-white/[0.03] px-6 py-12 sm:py-16 text-center shadow-soft transition-shadow hover:shadow-lift"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-brand-300/30 to-mint-300/20 blur-3xl animate-floaty" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-violet-300/20 to-brand-300/20 blur-3xl animate-floaty" style={{ animationDelay: "-3s" }} />

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            analyze(e.target.files ?? []);
            e.target.value = "";
          }}
        />

        <motion.div
          animate={{ y: dragOver ? -6 : 0 }}
          className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-mint-400 text-4xl shadow-lift"
        >
          {dragOver ? "✨" : "📥"}
        </motion.div>

        <h3 className="relative mt-6 text-xl font-bold sm:text-2xl">
          {dragOver ? t("home.dzDrag") : t("home.dzTitle")}
        </h3>
        <p className="relative mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("home.dzBrowseA")}{" "}
          <span className="font-semibold text-brand-600 dark:text-brand-300 underline underline-offset-4">
            {t("home.dzBrowse")}
          </span>{" "}
          {t("home.dzBrowseB")}
        </p>
        <p className="relative mt-4 text-xs text-gray-400 dark:text-gray-500">
          {t("home.dzMeta", {
            maxMb: Math.round(config.maxFileBytes / 1024 / 1024),
            maxFiles: config.maxFiles,
          })}
        </p>
      </motion.div>

      <AnimatePresence>
        {suggestion && (
          <motion.div
            key="suggestion"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mt-5 flex flex-col sm:flex-row items-center gap-4 rounded-3xl border border-brand-100 dark:border-white/10 bg-gradient-to-br from-brand-50 to-mint-50 dark:from-white/[0.06] dark:to-white/[0.02] p-5 shadow-soft"
          >
            <span className="text-3xl">{suggestion.emoji}</span>
            <div className="flex-1 text-center sm:text-left rtl:text-right">
              <p className="font-bold">{suggestion.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{suggestion.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetected(null)}
                className="rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label={t("home.dismiss")}
              >
                ✕
              </button>
              <Link href={suggestion.href} className="btn-primary !px-5 !py-2.5 text-sm">
                {suggestion.cta} →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
