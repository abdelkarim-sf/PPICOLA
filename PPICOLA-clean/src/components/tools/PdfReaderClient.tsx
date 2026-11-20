"use client";
import { useT } from "@/i18n";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DropZone from "./DropZone";
import ErrorList, { type ToolError } from "./ErrorList";
import { config } from "@/config";
import { formatBytes, readFileAsArrayBuffer } from "@/lib/files";
import { loadPdfDocument, renderPageToCanvas, PdfOpenError, getPdfJs } from "@/lib/pdf";

type LoadedDoc = {
  name: string;
  size: number;
  pageCount: number;
  dims: { width: number; height: number }[]; // 1x viewport dims
};

export default function PdfReaderClient() {
  const { t } = useT();
  const [doc, setDoc] = useState<LoadedDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ToolError[]>([]);
  const [scaleMode, setScaleMode] = useState<"fit" | "custom">("fit");
  const [customScale, setCustomScale] = useState(1.5);
  const [fitScale, setFitScale] = useState(1.5);
  const [currentPage, setCurrentPage] = useState(1);
  const [dark, setDark] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchIdx, setSearchIdx] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [thumbPages, setThumbPages] = useState<Record<number, string>>({});

  const pdfRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textCache = useRef<Map<number, string>>(new Map());

  const scale = scaleMode === "fit" ? fitScale : customScale;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const openPdf = useCallback(async (file: File) => {
    setLoading(true);
    setErrors([]);
    setDoc(null);
    setSearchResults([]);
    setQuery("");
    setCurrentPage(1);
    textCache.current.clear();
    try {
      const bytes = await readFileAsArrayBuffer(file);
      const pdf = await loadPdfDocument(bytes);
      pdfRef.current?.destroy?.();
      pdfRef.current = pdf;
      const dims: { width: number; height: number }[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        dims.push({ width: vp.width, height: vp.height });
      }
      setDoc({ name: file.name, size: file.size, pageCount: pdf.numPages, dims });
      // restore last page for the same file in this session
      try {
        const savedName = sessionStorage.getItem("ppicola-reader-file");
        const savedPage = Number(sessionStorage.getItem("ppicola-reader-page") || 1);
        if (savedName === file.name && savedPage > 1) {
          setTimeout(() => scrollToPage(savedPage), 400);
        }
      } catch {}
    } catch (err) {
      if (err instanceof PdfOpenError) setErrors([{ file: file.name, reason: t(`shared.errPdf${err.kind === "password" ? "Password" : err.kind === "corrupt" ? "Corrupt" : "Unknown"}`) }]);
      else setErrors([{ file: file.name, reason: t("p2i.readErr") }]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const maxPageWidth = useMemo(
    () => (doc ? Math.max(...doc.dims.map((d) => d.width)) : 612),
    [doc]
  );

  // track fit width from the pages column
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !doc) return;
    const update = () => setFitScale(Math.max(0.4, (el.clientWidth - 20) / maxPageWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc, maxPageWidth]);

  const scrollToPage = useCallback((n: number) => {
    const el = pageRefs.current[n - 1];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // current page tracking (rAF-throttled scroll)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !doc) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const base = el.getBoundingClientRect().top;
        const threshold = el.scrollTop + el.clientHeight * 0.35;
        let current = 1;
        for (let i = 0; i < doc.pageCount; i++) {
          const p = pageRefs.current[i];
          if (p) {
            const topAbs = p.getBoundingClientRect().top - base + el.scrollTop;
            if (topAbs <= threshold) current = i + 1;
          }
        }
        setCurrentPage(current);
        try {
          sessionStorage.setItem("ppicola-reader-file", doc.name);
          sessionStorage.setItem("ppicola-reader-page", String(current));
        } catch {}
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [doc]);

  // fullscreen tracking
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  // pinch-to-zoom via native (non-passive) touch listener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let startDist = 0;
    let startScale = 1;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches);
        startScale = scaleRef.current;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const ratio = dist(e.touches) / startDist;
        setScaleMode("custom");
        setCustomScale(Math.min(4, Math.max(0.4, startScale * ratio)));
      }
    };
    const onEnd = () => {
      startDist = 0;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [doc]);

  const runSearch = useCallback(async () => {
    const pdf = pdfRef.current;
    if (!pdf || !doc || !query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchIdx(-1);
    try {
      const q = query.trim().toLowerCase();
      const results: number[] = [];
      for (let i = 1; i <= doc.pageCount; i++) {
        let text: string | undefined = textCache.current.get(i);
        if (text === undefined) {
          const extracted = await extractPageText(pdf, i);
          textCache.current.set(i, extracted);
          text = extracted;
        }
        if (text.toLowerCase().includes(q)) results.push(i);
      }
      setSearchResults(results);
      if (results.length) {
        setSearchIdx(0);
        scrollToPage(results[0]);
      }
    } finally {
      setSearching(false);
    }
  }, [doc, query, scrollToPage]);

  const jumpSearch = (dir: 1 | -1) => {
    if (!searchResults.length) return;
    const next = (searchIdx + dir + searchResults.length) % searchResults.length;
    setSearchIdx(next);
    scrollToPage(searchResults[next]);
  };

  const closeReader = () => {
    pdfRef.current?.destroy?.();
    pdfRef.current = null;
    setDoc(null);
    setErrors([]);
    setSearchResults([]);
    setThumbPages({});
    setSidebar(false);
  };

  const pageHeight = (i: number) => {
    if (!doc) return 0;
    return Math.round(doc.dims[i].height * scale);
  };
  const pageWidth = (i: number) => {
    if (!doc) return 0;
    return Math.round(doc.dims[i].width * scale);
  };

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-mint-400 text-4xl shadow-lift animate-floaty">
            📖
          </span>
          <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">{t("reader.title")}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {t("reader.desc")}
          </p>
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-10">
          <ErrorList errors={errors} onDismiss={() => setErrors([])} />
          {loading ? (
            <div className="card-soft p-6">
              <div className="flex items-center gap-4">
                <div className="skeleton h-16 w-16 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded-full" />
                  <div className="skeleton h-3 w-1/3 rounded-full" />
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-500">{t("reader.opening")}</p>
            </div>
          ) : (
            <DropZone
              accept="pdf"
              multiple={false}
              maxBytes={config.maxFileBytes}
              maxFiles={1}
              onFiles={(f) => openPdf(f[0])}
              onRejected={setErrors}
              title={t("reader.dzTitle")}
              subtitle={t("reader.dzSub")}
              icon="📖"
            />
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-center">
            {[t("reader.hint1"), t("reader.hint2"), t("reader.hint3")].map((t) => (
              <div key={t} className="rounded-2xl bg-brand-50/60 dark:bg-white/[0.04] px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={isFullscreen ? "bg-[#0f0d1a]" : ""}>
      {/* toolbar */}
      <div className="sticky top-[68px] z-30 glass border-b border-black/5 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 sm:px-6 py-2.5">
          <button onClick={closeReader} className="btn-ghost !px-3.5 !py-2 text-xs sm:text-sm" title={t("reader.openTitle")}>
            {t("reader.open")}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{doc.name}</p>
            <p className="text-[11px] text-gray-400">{formatBytes(doc.size)} · {doc.pageCount} {t("reader.pagesWord")}</p>
          </div>

          {/* page jump */}
          <div className="flex items-center gap-1 rounded-xl border border-brand-100 dark:border-white/10 bg-white/70 dark:bg-white/5 px-2 py-1">
            <input
              type="number"
              min={1}
              max={doc.pageCount}
              value={currentPage}
              onChange={(e) => {
                const n = Math.max(1, Math.min(doc.pageCount, Number(e.target.value) || 1));
                scrollToPage(n);
              }}
              className="w-12 bg-transparent text-center text-sm font-bold outline-none"
              aria-label={t("reader.pageLabel")}
            />
            <span className="text-xs text-gray-400">/ {doc.pageCount}</span>
          </div>

          {/* zoom */}
          <div className="flex items-center gap-1 rounded-xl border border-brand-100 dark:border-white/10 bg-white/70 dark:bg-white/5 px-1.5 py-1">
            <ToolButton label={t("reader.zoomOut")} onClick={() => { setScaleMode("custom"); setCustomScale(Math.max(0.4, scale / 1.25)); }}>−</ToolButton>
            <span className="w-12 text-center text-xs font-bold">{Math.round(scale * 100)}%</span>
            <ToolButton label={t("reader.zoomIn")} onClick={() => { setScaleMode("custom"); setCustomScale(Math.min(4, scale * 1.25)); }}>+</ToolButton>
            <ToolButton label={t("reader.fitWidth")} onClick={() => setScaleMode("fit")}>⤢</ToolButton>
          </div>

          <ToolButton label={t("reader.thumbnails")} onClick={() => setSidebar((v) => !v)}>🗂️</ToolButton>
          <ToolButton label={t("reader.darkMode")} onClick={() => setDark((v) => !v)} active={dark}>🌙</ToolButton>
          <ToolButton label={t("reader.fullscreen")} onClick={toggleFullscreen}>⛶</ToolButton>
        </div>

        {/* search bar */}
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 sm:px-6 pb-2.5">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={t("reader.searchPh")}
              className="w-full rounded-xl border border-brand-100 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20"
              aria-label={t("reader.searchLabel")}
            />
          </div>
          <button onClick={runSearch} disabled={searching} className="btn-primary !px-4 !py-2 text-sm">
            {searching ? "…" : "🔍"}
          </button>
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <ToolButton label={t("reader.prevResult")} onClick={() => jumpSearch(-1)}>↑</ToolButton>
              <ToolButton label={t("reader.nextResult")} onClick={() => jumpSearch(1)}>↓</ToolButton>
              <span className="font-bold text-brand-600 dark:text-brand-300">{searchIdx + 1}/{searchResults.length}</span>
            </div>
          )}
          {query && searchResults.length === 0 && !searching && (
            <span className="text-xs text-gray-400">{t("reader.noMatches")}</span>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-4 px-3 sm:px-6 py-4">
        {/* thumbnails sidebar (desktop) */}
        <aside className={`${sidebar ? "hidden" : "hidden lg:block"} w-44 shrink-0`}>
          <div className="sticky top-[150px] max-h-[75vh] space-y-2 overflow-y-auto pr-1">
            {Array.from({ length: doc.pageCount }, (_, i) => i + 1).map((n) => (
              <ThumbButton
                key={n}
                n={n}
                thumb={thumbPages[n]}
                active={currentPage === n}
                marked={searchResults.includes(n)}
                onClick={() => scrollToPage(n)}
              />
            ))}
          </div>
        </aside>

        {/* pages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-5 overflow-y-auto px-1 pb-24"
          style={{ maxHeight: "calc(100vh - 150px)", touchAction: "pan-y" }}
        >
          {Array.from({ length: doc.pageCount }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              ref={(el) => {
                pageRefs.current[n - 1] = el;
              }}
              className="mx-auto"
              style={{ width: pageWidth(n - 1), minHeight: pageHeight(n - 1) }}
            >
              <ReaderPage
                pdf={pdfRef.current}
                n={n}
                scale={scale}
                dark={dark}
                onThumb={(url) => setThumbPages((m) => (m[n] ? m : { ...m, [n]: url }))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* mobile thumbnails bottom sheet */}
      <AnimatePresence>
        {sidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setSidebar(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[65vh] overflow-y-auto rounded-t-4xl border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#171427] p-4 lg:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">{t("reader.pagesWord")}</h3>
                <button onClick={() => setSidebar(false)} aria-label={t("reader.closeThumbs")} className="rounded-lg px-2 py-1 text-gray-400">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: doc.pageCount }, (_, i) => i + 1).map((n) => (
                  <ThumbButton
                    key={n}
                    n={n}
                    thumb={thumbPages[n]}
                    active={currentPage === n}
                    marked={searchResults.includes(n)}
                    onClick={() => {
                      scrollToPage(n);
                      setSidebar(false);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

async function extractPageText(pdf: any, n: number): Promise<string> {
  try {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    return content.items.map((it: any) => it.str ?? "").join(" ");
  } catch {
    return "";
  }
}

function ToolButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5 ${
        active
          ? "bg-brand-500 text-white shadow-lift"
          : "bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

/** One reader page: lazy-renders when near the viewport, frees memory when far. */
function ReaderPage({
  pdf,
  n,
  scale,
  dark,
  onThumb,
}: {
  pdf: any;
  n: number;
  scale: number;
  dark: boolean;
  onThumb: (url: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nearRef = useRef(false);
  const thumbDone = useRef(false);
  const [ready, setReady] = useState(false);

  const clear = useCallback(() => {
    const c = canvasRef.current;
    if (c) {
      c.width = 0;
      c.height = 0;
    }
    setReady(false);
  }, []);

  const render = useCallback(async () => {
    if (!pdf) return;
    try {
      const canvas = await renderPageToCanvas(pdf, n, scale);
      const prev = canvasRef.current;
      canvas.className = "h-auto w-full";
      if (prev && prev.parentNode) {
        prev.parentNode.replaceChild(canvas, prev);
        canvasRef.current = canvas;
      } else {
        canvasRef.current = canvas;
        wrapRef.current?.appendChild(canvas);
      }
      setReady(true);
      // low-res thumbnail for the sidebar (once)
      if (!thumbDone.current && scale >= 0.5) {
        thumbDone.current = true;
        try {
          const t = await renderPageToCanvas(pdf, n, 0.25);
          onThumb(t.toDataURL("image/jpeg", 0.6));
        } catch {
          /* thumbnail optional */
        }
      }
    } catch {
      /* page may have been destroyed */
    }
  }, [pdf, n, scale, onThumb]);

  // visibility observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries[0].isIntersecting;
        if (vis !== nearRef.current) {
          nearRef.current = vis;
          if (vis) render();
          else clear();
        }
      },
      { rootMargin: "900px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [render, clear]);

  // re-render on zoom when visible
  useEffect(() => {
    if (nearRef.current) render();
  }, [scale, render]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-xl shadow-soft ${dark ? "bg-[#0f0d1a]" : "bg-white"}`}
      style={{ filter: dark ? "invert(0.92) hue-rotate(180deg)" : undefined }}
    >
      {!ready && <div className="skeleton absolute inset-0" />}
    </div>
  );
}

function ThumbButton({
  n,
  thumb,
  active,
  marked,
  onClick,
}: {
  n: number;
  thumb?: string;
  active: boolean;
  marked: boolean;
  onClick: () => void;
}) {
  const { t } = useT();
  return (
    <button
      onClick={onClick}
      aria-label={t("reader.goToPage", { n })}
      className={`relative flex w-full items-center gap-2 rounded-xl border p-1.5 text-left transition-all hover:-translate-y-0.5 ${
        active
          ? "border-brand-400 bg-brand-50 dark:bg-white/10 ring-2 ring-brand-400/20"
          : "border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.04]"
      }`}
    >
      <span className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-400">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={t("reader.pageN", { n })} className="h-full w-full object-cover" />
        ) : (
          n
        )}
      </span>
      <span className="text-xs font-bold">{t("reader.pageN", { n })}</span>
      {marked && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-mint-400" title={t("reader.matchDot")} />}
    </button>
  );
}
